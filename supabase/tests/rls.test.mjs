// Pruebas de seguridad de supabase/schema.sql (aislamiento entre tenants, roles, invitaciones, Storage).
// Corren sobre PGlite (un Postgres en WebAssembly) con una emulación mínima de auth y storage de Supabase:
//   npm run test:db
// Correrlas cada vez que se cambie el esquema. No reemplazan probar contra el proyecto real de Supabase.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const SCHEMA = fs.readFileSync(fileURLToPath(new URL("../schema.sql", import.meta.url)), "utf8");
const db = new PGlite();

// ---- Emulación mínima de lo que Supabase ya trae instalado ----
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    email_confirmed_at timestamptz,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text, name text
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema public, auth, storage to anon, authenticated, service_role;
  grant select on auth.users to authenticated;  -- (solo para el test)
  grant all on storage.objects, storage.buckets to authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`);

let pass = 0, fail = 0;
const ok = (cond, name, extra = "") => {
  if (cond) { pass++; console.log("  ✔", name); }
  else { fail++; console.log("  ✘ FALLA:", name, extra); }
};

async function run(sql, params) {
  try { const r = await db.query(sql, params); return { rows: r.rows, count: r.affectedRows ?? r.rows.length }; }
  catch (e) { return { error: e.message }; }
}
// Ejecuta como un usuario de la app (rol authenticated + auth.uid())
async function as(uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${uid ? "authenticated" : "anon"};`);
  const r = await run(sql, params);
  await db.exec("reset role;");
  return r;
}
async function asPostgres(sql, params) { await db.exec("reset role;"); return run(sql, params); }

// ---- 1) El esquema corre, y es idempotente ----
console.log("\n1) Esquema");
await db.exec(SCHEMA).catch((e) => { console.log("ERROR esquema:", e.message); process.exit(1); });
ok(true, "schema.sql corre sin errores");
await db.exec(SCHEMA).catch((e) => { console.log("ERROR 2da corrida:", e.message); process.exit(1); });
ok(true, "schema.sql se puede volver a correr (idempotente)");
// Los tests usan estos dominios; el esquema trae solo ezmel.net.
await db.exec(`insert into public.allowed_email_domains (domain) values ('a.com'), ('b.com'), ('x.com'), ('z.com') on conflict do nothing`);

// ---- 2) Tenants y usuarios ----
console.log("\n2) Tenants e invitaciones");
const tA = (await asPostgres(`select public.create_tenant('Empresa A','empresa-a','adminA@a.com') as id`)).rows[0].id;
const tB = (await asPostgres(`select public.create_tenant('Empresa B','empresa-b','adminB@b.com') as id`)).rows[0].id;
ok(tA && tB && tA !== tB, "create_tenant crea dos tenants");

const newUser = async (email, confirmed = true, meta = {}) =>
  (await asPostgres(
    `insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values ($1, ${confirmed ? "now()" : "null"}, $2::jsonb) returning id`,
    [email, JSON.stringify(meta)]
  )).rows[0].id;
const prof = async (id) => (await asPostgres(`select tenant_id, role, active, full_name from public.profiles where id = $1`, [id])).rows[0];

const adminA = await newUser("AdminA@a.com", true, { full_name: "Admin A" });
const adminB = await newUser("adminB@b.com");
let p = await prof(adminA);
ok(p.tenant_id === tA && p.role === "admin", "el admin invitado queda admin de su tenant (email sin importar mayúsculas)");
ok(p.full_name === "Admin A", "toma el nombre del metadata de Google");
p = await prof(adminB);
ok(p.tenant_id === tB && p.role === "admin", "el admin de B queda en B");

const extraño = await newUser("nadie@x.com");
p = await prof(extraño);
ok(p.tenant_id === null && p.role === null, "un usuario sin invitación queda SIN tenant ni rol");

// Email/contraseña: no confirmado => no hereda la invitación
const opSinConfirmar = await newUser("op@a.com", false);
await as(adminA, `select public.invite_member('Op@A.com','operador')`);
p = await prof(opSinConfirmar);
ok(p.tenant_id === null, "invitación NO se aplica a un email sin confirmar");
await asPostgres(`update auth.users set email_confirmed_at = now() where id = $1`, [opSinConfirmar]);
p = await prof(opSinConfirmar);
ok(p.tenant_id === tA && p.role === "operador", "al confirmar el email se aplica la invitación");

const lectura = await newUser("lee@a.com");
await as(adminA, `select public.invite_member('lee@a.com','lectura')`);
p = await prof(lectura);
ok(p.tenant_id === tA && p.role === "lectura", "invite_member sobre usuario ya registrado lo asocia en el acto");

let r = await as(opSinConfirmar, `select public.invite_member('x@a.com','admin')`);
ok(!!r.error, "un operador NO puede invitar", r.error);
r = await as(extraño, `select public.invite_member('x@a.com','admin')`);
ok(!!r.error, "un usuario sin tenant NO puede invitar");
r = await as(adminA, `select public.invite_member('adminB@b.com','operador')`);
ok(!!r.error, "no se puede invitar a alguien que ya pertenece a otro tenant", r.error);
r = await as(adminA, `select public.create_tenant('Hack','hack','a@a.com')`);
ok(!!r.error, "un usuario autenticado NO puede ejecutar create_tenant", r.error);
r = await as(null, `select public.create_tenant('Hack','hack','a@a.com')`);
ok(!!r.error, "anon NO puede ejecutar create_tenant");

// ---- 3) Aislamiento y permisos sobre datos ----
console.log("\n3) Datos: aislamiento entre tenants y permisos por rol");
const id = () => crypto.randomUUID();
const leg = (tenant, by) => [id(), tenant, by, JSON.stringify({ nombre: "x" })];
const insLeg = (uid, tenant, by) =>
  as(uid, `insert into public.legajos (id, tenant_id, created_by, data) values ($1,$2,$3,$4::jsonb) returning id`, leg(tenant, by));

r = await insLeg(opSinConfirmar, tA, opSinConfirmar);
ok(!r.error, "operador crea legajo en su tenant", r.error);
const legA = r.rows?.[0]?.id;
r = await insLeg(opSinConfirmar, tB, opSinConfirmar);
ok(!!r.error, "operador NO puede crear legajo en otro tenant");
r = await insLeg(opSinConfirmar, tA, adminA);
ok(!!r.error, "operador NO puede crear legajo a nombre de otro usuario");
r = await insLeg(lectura, tA, lectura);
ok(!!r.error, "rol lectura NO puede crear");
r = await insLeg(extraño, tA, extraño);
ok(!!r.error, "usuario sin tenant NO puede crear");
r = await insLeg(null, tA, adminA);
ok(!!r.error, "anon NO puede crear");

r = await as(lectura, `select id from public.legajos`);
ok(r.rows?.length === 1, "lectura SÍ ve los legajos de su tenant");
r = await as(adminB, `select id from public.legajos`);
ok(r.rows?.length === 0, "admin de OTRO tenant no ve nada");
r = await as(extraño, `select id from public.legajos`);
ok(r.rows?.length === 0, "usuario sin tenant no ve nada");
r = await as(null, `select id from public.legajos`);
ok(!!r.error, "anon no puede ni consultar la tabla");

r = await as(opSinConfirmar, `delete from public.legajos where id = $1`, [legA]);
ok((r.count ?? 0) === 0, "operador NO puede borrar");
r = await as(adminB, `delete from public.legajos where id = $1`, [legA]);
ok((r.count ?? 0) === 0, "admin de otro tenant NO puede borrar");
r = await as(opSinConfirmar, `update public.legajos set data = '{}'::jsonb where id = $1`, [legA]);
ok(!!r.error, "los legajos no se pueden editar");

// contratos
const insCon = (uid, tenant, by) =>
  as(uid, `insert into public.contratos (id, tenant_id, created_by, datos) values ($1,$2,$3,'{}'::jsonb) returning id`, [id(), tenant, by]);
r = await insCon(adminA, tA, adminA);
ok(!r.error, "admin crea contrato");
r = await insCon(lectura, tA, lectura);
ok(!!r.error, "lectura NO crea contrato");
r = await as(adminB, `select id from public.contratos`);
ok(r.rows?.length === 0, "otro tenant no ve contratos ajenos");

// archivos de legajo
r = await as(opSinConfirmar, `insert into public.legajo_files (tenant_id, legajo_id, slot_key, file_name, storage_path) values ($1,$2,'dni','a.png','x')`, [tA, legA]);
ok(!r.error, "operador sube registro de archivo a su legajo", r.error);
r = await as(adminB, `insert into public.legajo_files (tenant_id, legajo_id, slot_key, file_name, storage_path) values ($1,$2,'dni','a.png','x')`, [tB, legA]);
ok(!!r.error, "NO se puede colgar archivos de un legajo de otro tenant");

r = await as(adminA, `delete from public.legajos where id = $1`, [legA]);
ok(r.count === 1, "admin SÍ borra legajos de su tenant");

// ---- 4) Escalada de privilegios ----
console.log("\n4) Escalada de privilegios");
r = await as(opSinConfirmar, `update public.profiles set role = 'admin' where id = $1`, [opSinConfirmar]);
ok(!!r.error, "un operador NO puede subirse el rol");
r = await as(opSinConfirmar, `update public.profiles set tenant_id = $1 where id = $2`, [tB, opSinConfirmar]);
ok(!!r.error, "un operador NO puede cambiarse de tenant");
r = await as(opSinConfirmar, `update public.profiles set active = true where id = $1`, [opSinConfirmar]);
ok(!!r.error, "no puede tocar su estado activo");
r = await as(opSinConfirmar, `update public.profiles set full_name = 'Nuevo Nombre' where id = $1`, [opSinConfirmar]);
ok(!r.error && r.count === 1, "SÍ puede editar su propio nombre");
r = await as(opSinConfirmar, `update public.profiles set full_name = 'Hackeado' where id = $1`, [adminA]);
ok((r.count ?? 0) === 0, "NO puede editar el perfil de otro");
r = await as(opSinConfirmar, `insert into public.profiles (id, email, tenant_id, role) values (gen_random_uuid(),'x@x.com',$1,'admin')`, [tA]);
ok(!!r.error, "NO puede insertar perfiles");
r = await as(adminA, `insert into public.tenants (name, slug) values ('x','x')`);
ok(!!r.error, "ni siquiera un admin puede insertar tenants directo");
r = await as(adminA, `insert into public.invitations (tenant_id, email, role) values ($1,'z@z.com','admin')`, [tA]);
ok(!!r.error, "las invitaciones solo se crean con invite_member");
r = await as(opSinConfirmar, `select * from public.invitations`);
ok(r.rows?.length === 0, "un operador no ve invitaciones");
r = await as(adminA, `select * from public.invitations`);
ok(r.rows?.length >= 0 && !r.error, "un admin sí consulta las invitaciones de su tenant");
r = await as(adminB, `select * from public.invitations where tenant_id = $1`, [tA]);
ok(r.rows?.length === 0, "admin de otro tenant no ve invitaciones ajenas");
r = await as(adminB, `select * from public.profiles where tenant_id = $1`, [tA]);
ok(r.rows?.length === 0, "no se ven perfiles de otro tenant");
r = await as(adminA, `select * from public.profiles`);
ok(r.rows?.length === 3, "el superadmin ve los perfiles de su tenant (3)", String(r.rows?.length));
r = await as(opSinConfirmar, `select * from public.profiles`);
ok(r.rows?.length === 1 && r.rows[0].id === opSinConfirmar, "un operador solo ve su propio perfil", String(r.rows?.length));
r = await as(lectura, `select * from public.profiles`);
ok(r.rows?.length === 1, "un usuario de solo lectura solo ve su propio perfil");
r = await as(adminB, `select * from public.tenants`);
ok(r.rows?.length === 1 && r.rows[0].id === tB, "solo se ve el propio tenant");

// ---- 5) Gestión de miembros ----
console.log("\n5) Gestión de miembros");
r = await as(opSinConfirmar, `select public.set_member_role($1,'admin')`, [opSinConfirmar]);
ok(!!r.error, "un operador no cambia roles");
r = await as(adminB, `select public.set_member_role($1,'lectura')`, [opSinConfirmar]);
ok(!!r.error, "un admin de otro tenant no cambia roles ajenos");
r = await as(adminA, `select public.set_member_role($1,'lectura')`, [adminA]);
ok(!!r.error, "no se puede dejar al tenant sin administradores");
r = await as(adminA, `select public.set_member_role($1,'admin')`, [opSinConfirmar]);
ok(!r.error, "un admin promueve a un operador", r.error);
r = await as(adminA, `select public.set_member_role($1,'operador')`, [adminA]);
ok(!!r.error, "el superadmin (usuario principal) no puede cambiarse el rol", r.error);
r = await as(adminA, `select public.set_member_active($1,false)`, [adminA]);
ok(!!r.error, "el superadmin (usuario principal) no puede desactivarse", r.error);
r = await as(opSinConfirmar, `select public.set_member_active($1,false)`, [adminA]);
ok(!!r.error, "un admin común NO puede desactivar usuarios", r.error);
r = await as(opSinConfirmar, `select public.invite_member('nuevo@a.com','operador')`);
ok(!!r.error, "un admin común NO puede invitar usuarios", r.error);
r = await as(opSinConfirmar, `select public.set_member_role($1,'lectura')`, [lectura]);
ok(!!r.error, "un admin común NO puede cambiar roles", r.error);
r = await as(opSinConfirmar, `select * from public.invitations`);
ok(r.rows?.length === 0 && !r.error, "un admin común no ve las invitaciones");
r = await as(opSinConfirmar, `select * from public.legajos`);
ok(!r.error, "un admin común sí trabaja con los datos (legajos)");
const temporal = await newUser("temporal@a.com");
await as(adminA, `select public.invite_member('temporal@a.com','operador')`);
r = await as(adminA, `select public.set_member_active($1,false)`, [temporal]);
ok(!r.error, "el superadmin desactiva a un usuario", r.error);
r = await as(temporal, `select * from public.legajos`);
ok(r.rows?.length === 0 && !r.error, "un usuario desactivado ya no ve datos");
r = await insLeg(temporal, tA, temporal);
ok(!!r.error, "un usuario desactivado no puede crear");
r = await as(adminA, `select public.set_member_active($1,true)`, [temporal]);
ok(!r.error, "el superadmin lo vuelve a activar", r.error);

// ---- 6) Tenant inactivo ----
console.log("\n6) Tenant inactivo");
await asPostgres(`update public.tenants set active = false where id = $1`, [tB]);
r = await as(adminB, `select * from public.legajos`);
ok(r.rows?.length === 0, "con el tenant desactivado el admin pierde el acceso");
r = await as(adminB, `select * from public.tenants`);
ok(r.rows?.length === 0, "y ya no ve ni su tenant");

// ---- 7) Storage ----
console.log("\n7) Storage (bucket privado por tenant)");
const bucket = (await asPostgres(`select public, file_size_limit, allowed_mime_types from storage.buckets where id='legajo-files'`)).rows[0];
ok(bucket && bucket.public === false, "el bucket legajo-files existe y es privado");
const insObj = (uid, name) => as(uid, `insert into storage.objects (bucket_id, name) values ('legajo-files', $1)`, [name]);
r = await insObj(opSinConfirmar, `${tA}/${id()}/dni-1.png`);
ok(!r.error, "sube a la carpeta de su tenant", r.error);
r = await insObj(opSinConfirmar, `${tB}/${id()}/dni-1.png`);
ok(!!r.error, "NO puede subir a la carpeta de otro tenant");
r = await insObj(lectura, `${tA}/${id()}/dni-1.png`);
ok(!!r.error, "lectura NO puede subir");
r = await insObj(null, `${tA}/${id()}/dni-1.png`);
ok(!!r.error, "anon NO puede subir");
r = await as(lectura, `select name from storage.objects where bucket_id='legajo-files'`);
ok(r.rows?.length === 1, "lectura SÍ ve archivos de su tenant");
r = await as(extraño, `select name from storage.objects where bucket_id='legajo-files'`);
ok(r.rows?.length === 0, "usuario sin tenant no ve archivos");
r = await as(adminB, `select name from storage.objects where bucket_id='legajo-files'`);
ok(r.rows?.length === 0, "otro tenant no ve archivos ajenos");

// ---- 8) Dominio de email y superadministrador ----
console.log("\n8) Dominio de email y superadministrador");
const own = (await asPostgres(`select id, owner_id from public.tenants where id in ($1,$2)`, [tA, tB])).rows;
ok(own.find((t) => t.id === tA)?.owner_id === adminA, "el primer admin invitado con create_tenant es el usuario principal");
ok(own.find((t) => t.id === tB)?.owner_id === adminB, "cada tenant tiene su propio usuario principal");
r = await as(adminA, `select public.is_tenant_owner() as o`);
ok(r.rows?.[0]?.o === true, "is_tenant_owner: el principal es superadmin");
r = await as(opSinConfirmar, `select public.is_tenant_owner() as o`);
ok(r.rows?.[0]?.o === false, "is_tenant_owner: un admin común no lo es");

r = await asPostgres(`insert into auth.users (email, email_confirmed_at) values ('ok@a.com', now())`);
ok(!r.error, "se puede registrar un email de un dominio autorizado", r.error);
r = await asPostgres(`insert into auth.users (email, email_confirmed_at) values ('Mayus@A.COM', now())`);
ok(!r.error, "el dominio se compara sin importar mayúsculas", r.error);
for (const mal of ["intruso@gmail.com", "x@a.com@evil.com", "x@sub.a.com", "x@a.com.evil.com", "x@evil-a.com", "sin-arroba", "a b@a.com"]) {
  r = await asPostgres(`insert into auth.users (email, email_confirmed_at) values ($1, now())`, [mal]);
  ok(!!r.error, `NO se registra "${mal}"`);
}
r = await asPostgres(`insert into auth.users (email) values (null)`);
ok(!!r.error, "NO se registran cuentas sin email");

r = await asPostgres(`update auth.users set email = 'otro@gmail.com' where email = 'ok@a.com'`);
ok(!!r.error, "NO se puede cambiar el email a un dominio no autorizado");
r = await asPostgres(`update auth.users set email = 'nuevo-ok@a.com' where email = 'ok@a.com'`);
ok(!r.error, "sí se puede cambiar el email a un dominio autorizado", r.error);

// Una cuenta anterior a la regla (con otro dominio) no se rompe: sigue pudiendo actualizarse.
await asPostgres(`alter table auth.users disable trigger enforce_email_domain`);
await asPostgres(`insert into auth.users (email, email_confirmed_at) values ('vieja@legacy.com', now())`);
await asPostgres(`alter table auth.users enable trigger enforce_email_domain`);
r = await asPostgres(`update auth.users set raw_user_meta_data = '{"x":1}'::jsonb where email = 'vieja@legacy.com'`);
ok(!r.error, "una cuenta existente con otro dominio puede seguir actualizándose (sin cambiar el email)", r.error);

r = await as(adminA, `select public.invite_member('persona@gmail.com','operador')`);
ok(!!r.error && /dominio/i.test(r.error), "el superadmin NO puede invitar a un dominio no autorizado", r.error);
r = await asPostgres(`select public.create_tenant('Otra','otra','jefe@otra-empresa.com')`);
ok(!!r.error, "create_tenant exige dominio autorizado para el primer admin", r.error);
await asPostgres(`insert into public.allowed_email_domains (domain) values ('otra-empresa.com')`);
r = await asPostgres(`select public.create_tenant('Otra','otra','jefe@otra-empresa.com')`);
ok(!r.error, "agregando el dominio, create_tenant funciona", r.error);

r = await as(null, `select public.is_email_allowed('x@a.com') as v`);
ok(r.rows?.[0]?.v === true, "anon puede consultar si un email está permitido (true)");
r = await as(null, `select public.is_email_allowed('x@gmail.com') as v`);
ok(r.rows?.[0]?.v === false, "anon puede consultar si un email está permitido (false)");
r = await as(adminA, `select * from public.allowed_email_domains`);
ok(!!r.error, "la tabla de dominios no se puede leer desde la API");
r = await as(adminA, `insert into public.allowed_email_domains (domain) values ('hack.com')`);
ok(!!r.error, "la tabla de dominios no se puede modificar desde la API");
r = await as(null, `select * from public.allowed_email_domains`);
ok(!!r.error, "anon no lee la tabla de dominios");

// Excepción para el email del desarrollador (único fuera del dominio de la empresa).
const dev = "ezequieldehnike@gmail.com";
r = await asPostgres(`insert into auth.users (email, email_confirmed_at) values ($1, now())`, [dev]);
ok(!r.error, "el email del desarrollador (excepción) puede registrarse", r.error);
r = await asPostgres(`select public.is_email_allowed('EzequielDehnike@Gmail.com') as v`);
ok(r.rows?.[0]?.v === true, "el email del desarrollador se reconoce sin importar mayúsculas");
for (const mal of ["otra.persona@gmail.com", "ezequieldehnike@gmail.com.evil.com", "x+ezequieldehnike@gmail.com", "ezequieldehnike2@gmail.com", "ezequieldehnike@googlemail.com"]) {
  r = await asPostgres(`insert into auth.users (email, email_confirmed_at) values ($1, now())`, [mal]);
  ok(!!r.error, `la excepción NO habilita a "${mal}"`);
}
r = await as(null, `select public.is_email_allowed('ezequieldehnike@gmail.com') as v`);
ok(r.rows?.[0]?.v === true, "is_email_allowed: el email del desarrollador es true");
r = await as(null, `select public.is_email_allowed('cualquiera@gmail.com') as v`);
ok(r.rows?.[0]?.v === false, "is_email_allowed: otro Gmail es false");
r = await as(adminA, `select * from public.allowed_email_addresses`);
ok(!!r.error, "la lista de emails permitidos no se puede leer desde la API");
r = await as(adminA, `insert into public.allowed_email_addresses (email) values ('hack@gmail.com')`);
ok(!!r.error, "la lista de emails permitidos no se puede modificar desde la API");
r = await as(null, `select * from public.allowed_email_addresses`);
ok(!!r.error, "anon no lee la lista de emails permitidos");

// Con la tabla vacía no se registra nadie (falla cerrado).
const dominios = (await asPostgres(`select domain from public.allowed_email_domains`)).rows.map((x) => x.domain);
const direcciones = (await asPostgres(`select email from public.allowed_email_addresses`)).rows.map((x) => x.email);
await asPostgres(`delete from public.allowed_email_domains`);
await asPostgres(`delete from public.allowed_email_addresses`);
r = await asPostgres(`insert into auth.users (email, email_confirmed_at) values ('cualquiera@a.com', now())`);
ok(!!r.error, "con la lista de dominios vacía no se registra nadie");
for (const d of dominios) await asPostgres(`insert into public.allowed_email_domains (domain) values ($1)`, [d]);
for (const e of direcciones) await asPostgres(`insert into public.allowed_email_addresses (email) values ($1)`, [e]);

// ---- 9) Tasas ----
console.log("\n9) Tasas (clientes nuevos y antiguos)");
const tasasDe = async (tenant) =>
  (await asPostgres(`select * from public.tasas where tenant_id = $1 order by tipo_cliente`, [tenant])).rows;
let tA_tasas = await tasasDe(tA);
ok(tA_tasas.length === 2, "create_tenant crea las tasas de clientes nuevos y antiguos");
const nuevo = tA_tasas.find((t) => t.tipo_cliente === "nuevo");
const antiguo = tA_tasas.find((t) => t.tipo_cliente === "antiguo");
const cerca = (a, b) => Math.abs(Number(a) - b) < 1e-9;
ok(cerca(nuevo.interes_1_semana, 0.4) && nuevo.max_semanas === 16 && cerca(nuevo.interes_adicional_semana, 0.8 / 15),
  "clientes nuevos: 40 % a 1 semana, +5,333 % por semana, 16 semanas");
ok(cerca(antiguo.interes_1_semana, 0.3) && antiguo.max_semanas === 20 && cerca(antiguo.interes_adicional_semana, 0.86 / 19),
  "clientes antiguos: 30 % a 1 semana, +4,526 % por semana, 20 semanas");
ok(cerca(Number(nuevo.interes_1_semana) + 15 * Number(nuevo.interes_adicional_semana), 1.2), "nuevos: la semana 16 da 120 %");
ok(cerca(Number(antiguo.interes_1_semana) + 19 * Number(antiguo.interes_adicional_semana), 1.16), "antiguos: la semana 20 da 116 %");
ok(nuevo.redondeo_cuota == 1 && nuevo.gastos_otorgamiento == 0 && cerca(nuevo.iva, 0.21), "redondeo 1, gastos 0 % e IVA 21 %");

r = await as(adminA, `select tipo_cliente from public.tasas`);
ok(r.rows?.length === 2, "un miembro del tenant lee las tasas de su tenant");
r = await as(lectura, `select tipo_cliente from public.tasas`);
ok(r.rows?.length === 2, "un usuario de solo lectura también las lee");
// El tenant B quedó desactivado en la sección 6: se reactiva para comprobar que cada tenant ve solo lo suyo.
await asPostgres(`update public.tenants set active = true where id = $1`, [tB]);
r = await as(adminB, `select tenant_id from public.tasas`);
ok(r.rows?.length === 2 && r.rows.every((x) => x.tenant_id === tB), "cada tenant ve únicamente sus tasas");
r = await as(extraño, `select * from public.tasas`);
ok(r.rows?.length === 0 && !r.error, "un usuario sin tenant no ve tasas");
r = await as(null, `select * from public.tasas`);
ok(!!r.error, "anon NO lee las tasas");
r = await as(adminA, `update public.tasas set interes_1_semana = 0 where tenant_id = $1`, [tA]);
ok(!!r.error, "ni un admin modifica las tasas desde la API", r.error);
r = await as(adminA, `insert into public.tasas (tenant_id, tipo_cliente, interes_1_semana, interes_adicional_semana) values ($1, 'nuevo', 0.1, 0.1)`, [tA]);
ok(!!r.error, "nadie inserta tasas desde la API");
r = await as(adminA, `delete from public.tasas where tenant_id = $1`, [tA]);
ok(!!r.error, "nadie borra tasas desde la API");
r = await as(adminA, `select public.crear_tasas_por_defecto($1)`, [tA]);
ok(!!r.error, "crear_tasas_por_defecto no se puede ejecutar desde la API");
r = await asPostgres(`update public.tasas set max_semanas = 0 where tenant_id = $1 and tipo_cliente = 'nuevo'`, [tA]);
ok(!!r.error, "la base rechaza una tabla de 0 semanas");
r = await asPostgres(`update public.tasas set gastos_otorgamiento = 1 where tenant_id = $1 and tipo_cliente = 'nuevo'`, [tA]);
ok(!!r.error, "la base rechaza gastos de 100 %");
r = await asPostgres(`update public.tasas set tabla_manual = '[1,2]'::jsonb where tenant_id = $1 and tipo_cliente = 'nuevo'`, [tA]);
ok(!!r.error, "la tabla manual tiene que ser un objeto");
tA_tasas = await tasasDe(tA);
ok(tA_tasas.find((t) => t.tipo_cliente === "nuevo").max_semanas === 16, "los intentos inválidos no cambiaron nada");

// Volver a correr el esquema repone las tasas de un tenant que no las tenía, sin pisar las existentes.
await asPostgres(`delete from public.tasas where tenant_id = $1`, [tA]);
await asPostgres(`update public.tasas set interes_1_semana = 0.5 where tenant_id = $1`, [tB]);
await db.exec(SCHEMA);
ok((await tasasDe(tA)).length === 2, "al volver a correr el esquema se crean las tasas que faltaban");
ok(cerca((await tasasDe(tB)).find((t) => t.tipo_cliente === "nuevo").interes_1_semana, 0.5), "y no pisa las que ya estaban cargadas");

console.log(`\nResultado: ${pass} OK, ${fail} fallas`);
process.exit(fail ? 1 : 0);
