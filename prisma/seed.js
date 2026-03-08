const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const BANCOS = ['BBVA', 'Banorte', 'Santander', 'HSBC', 'Scotiabank', 'Citibanamex', 'Banco Azteca', 'BanRegio', 'Inbursa', 'Afirme'];

const EST_DATA = [
  { e: 'Jalisco', c: ['Guadalajara', 'Zapopan', 'Puerto Vallarta'] },
  { e: 'Nuevo Leon', c: ['Monterrey', 'San Pedro', 'Apodaca'] },
  { e: 'Edo. Mexico', c: ['Toluca', 'Naucalpan', 'Ecatepec'] },
  { e: 'CDMX', c: ['Cuauhtemoc', 'Miguel Hidalgo', 'Coyoacan'] },
  { e: 'Guanajuato', c: ['Leon', 'Irapuato', 'Celaya'] },
  { e: 'Queretaro', c: ['Queretaro', 'San Juan del Rio'] },
  { e: 'Puebla', c: ['Puebla', 'Cholula'] },
  { e: 'Aguascalientes', c: ['Aguascalientes'] },
  { e: 'Michoacan', c: ['Morelia', 'Uruapan'] },
  { e: 'Chihuahua', c: ['Chihuahua', 'Cd. Juarez'] },
];

const EMPRESAS = [
  'Transportes del Norte', 'Autobuses Rojos', 'Fletes Modernos', 'Logistica Express',
  'Materiales Constructivos', 'Distribuidora del Bajio', 'Agroservicios Unidos', 'Combustibles Premium',
  'Carga Pesada MX', 'Industrial del Centro', 'Maquinaria Agricola', 'Alimentos del Pacifico',
  'Minera del Norte', 'Quimica Industrial', 'Refrescos del Valle', 'Lacteos Frescos',
  'Pavimentos y Asfaltos', 'Ferreterias Unidas', 'Plasticos del Sureste', 'Empaques Modernos',
  'Textiles Finos', 'Ganaderia Integral', 'Aceros del Golfo', 'Cemento Nacional',
  'Vidrios y Cristales', 'Papel y Carton SA', 'Electronica Industrial', 'Pinturas del Centro',
  'Maderas Selectas', 'Fundiciones del Norte',
];

const NOMBRES_OP = [
  ['Luis', 'Gonzalez'], ['Ana', 'Rodriguez'], ['Carlos', 'Mendoza'], ['Patricia', 'Jimenez'],
  ['Miguel', 'Alvarez'], ['Gabriela', 'Morales'], ['Fernando', 'Castillo'], ['Diana', 'Vargas'],
  ['Jorge', 'Gutierrez'], ['Elena', 'Reyes'],
];

const CONTACTOS = [
  'Juan Perez', 'Maria Lopez', 'Carlos Garcia', 'Ana Martinez', 'Roberto Sanchez',
  'Laura Hernandez', 'Pedro Ramirez', 'Sofia Torres', 'Diego Flores', 'Isabel Cruz',
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randEl(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function genRef(prefix) {
  const d = new Date();
  const ds = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  return `${prefix}-${ds}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

async function main() {
  console.log('Limpiando base de datos...');
  await prisma.auditLog.deleteMany();
  await prisma.pago.deleteMany();
  await prisma.consumo.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.estacion.deleteMany();
  await prisma.config.deleteMany();

  // Config
  console.log('Creando configuracion...');
  await prisma.config.create({
    data: {
      id: 'singleton',
      diasCreditoDefault: 30,
      tasaMoratoriaDefault: 2.5,
      alertaCartera: 80,
      alertaMoroso: 5,
      maxLineaCredito: 50000000,
    },
  });

  // Estaciones
  console.log('Creando 10 estaciones...');
  const estaciones = [];
  for (let i = 0; i < 10; i++) {
    const ed = EST_DATA[i];
    const ciudad = randEl(ed.c);
    const num = 'EST-' + String(i + 1).padStart(4, '0');
    const est = await prisma.estacion.create({
      data: {
        nombre: `Estacion ${ciudad}`,
        num,
        ciudad,
        estado: ed.e,
        razonSocial: `GAP Estacion ${ciudad} SA de CV`,
        rfc: `GAP${900 + i}101ABC`,
        domicilio: `Av. Principal #${rand(1000, 9999)}, Col. Centro`,
        cp: String(rand(10000, 99999)),
        banco: BANCOS[i % BANCOS.length],
        cuenta: String(rand(1000000000, 9999999999)),
        clabe: '0' + String(rand(10000000000000000, 99999999999999999)),
        beneficiario: `GAP Estacion ${ciudad}`,
        contactoNombre: CONTACTOS[i],
        contactoTel: `33${rand(10000000, 99999999)}`,
        contactoEmail: `estacion.${ciudad.toLowerCase().replace(/ /g, '')}@gap.com.mx`,
        activa: true,
      },
    });
    estaciones.push(est);
  }

  // Usuarios admin
  console.log('Creando usuarios admin...');
  const adminHash = await bcrypt.hash('Admin123!', 12);
  await prisma.usuario.create({
    data: {
      nombre: 'Administrador', ap: 'General', email: 'admin@gap.com.mx',
      passwordHash: adminHash, tipo: 'ADMIN', rfc: 'XAXX010101000',
      tel: '3300000000', pin: '1234', activo: true,
    },
  });
  await prisma.usuario.create({
    data: {
      nombre: 'Director', ap: 'Operaciones', email: 'director@gap.com.mx',
      passwordHash: adminHash, tipo: 'ADMIN', rfc: 'XAXX010101001',
      tel: '3300000001', pin: '1234', activo: true,
    },
  });

  // Operadores
  console.log('Creando 10 operadores...');
  const opHash = await bcrypt.hash('Oper1234!', 12);
  const operadores = [];
  for (let i = 0; i < 10; i++) {
    const [nom, ap] = NOMBRES_OP[i];
    const op = await prisma.usuario.create({
      data: {
        nombre: nom, ap, email: `${nom.toLowerCase()}.${ap.toLowerCase()}@gap.com.mx`,
        passwordHash: opHash, tipo: 'OPERADOR', estacionId: estaciones[i].id,
        rfc: `XXXX0${i}0101XXX`, tel: `33${10000000 + i}`, pin: '0000', activo: true,
      },
    });
    operadores.push(op);
  }

  // Clientes, Contratos, Consumos, Pagos
  console.log('Creando clientes, contratos, consumos y pagos...');
  const hoy = new Date();
  let empIdx = 0;

  for (let ei = 0; ei < estaciones.length; ei++) {
    const est = estaciones[ei];
    const nCli = rand(5, 8);

    for (let j = 0; j < nCli; j++) {
      const emp = EMPRESAS[empIdx % EMPRESAS.length];
      empIdx++;

      const cli = await prisma.cliente.create({
        data: {
          estacionId: est.id,
          razonSocial: `${emp} de ${est.ciudad}`,
          rfc: `${emp.substring(0, 3).toUpperCase()}${800 + empIdx}ABC`,
          domicilioFiscal: `Calle ${rand(1, 200)}, ${est.ciudad}, ${est.estado}`,
          representanteLegal: `${['Lic. ', 'Ing. ', 'C.P. '][j % 3]}${['Roberto', 'Patricia', 'Enrique', 'Monica', 'Alejandro'][j % 5]} ${['Vega', 'Soto', 'Rios', 'Luna', 'Campos'][j % 5]}`,
          telefono: `33${rand(10000000, 99999999)}`,
          email: `${emp.substring(0, 5).toLowerCase().replace(/ /g, '')}@correo.com`,
          activo: true,
          fechaRegistro: new Date(hoy.getTime() - Math.random() * 180 * 86400000),
        },
      });

      // 1-2 contratos
      const nCtr = rand(1, 2);
      for (let k = 0; k < nCtr; k++) {
        const linea = rand(5, 25) * 10000 * 100; // 50k-250k en centavos
        const inicio = new Date(hoy.getTime() - Math.random() * 120 * 86400000);
        const venc = new Date(inicio.getTime() + (180 + Math.random() * 180) * 86400000);
        const status = venc < hoy ? 'VENCIDO' : 'VIGENTE';
        const ctrCount = await prisma.contrato.count() + 1;
        const numero = `CTR-${est.num.replace('EST-', '')}-${hoy.getFullYear()}-${String(ctrCount).padStart(3, '0')}`;

        const ctr = await prisma.contrato.create({
          data: {
            estacionId: est.id, clienteId: cli.id, numero,
            lineaCredito: linea, fechaInicio: inicio, fechaVencimiento: venc,
            fianzaMonto: Math.floor(linea * 0.1),
            fianzaTipo: ['BANCARIA', 'EFECTIVO', 'ASEGURADORA'][k % 3],
            condicionesPago: [15, 30, 30, 45][rand(0, 3)],
            tasaMoratoria: 2.5,
            docContrato: `Contrato_${ctrCount}.pdf`,
            docPagare: `Pagare_${ctrCount}.pdf`,
            docFianza: `Fianza_${ctrCount}.pdf`,
            status,
          },
        });

        // 3-6 consumos por contrato vigente
        if (status === 'VIGENTE') {
          const nCons = rand(3, 6);
          for (let m = 0; m < nCons; m++) {
            const montoMax = Math.floor(linea * 0.15);
            const monto = rand(500000, montoMax);
            const fc = new Date(hoy.getTime() - Math.random() * 60 * 86400000);
            const limite = new Date(fc.getTime() + ctr.condicionesPago * 86400000);
            let cStatus = 'PENDIENTE';
            if (Math.random() < 0.35) cStatus = 'PAGADO';
            else if (limite < hoy) cStatus = 'VENCIDO';

            await prisma.consumo.create({
              data: {
                estacionId: est.id, clienteId: cli.id, contratoId: ctr.id,
                monto, descripcion: 'Consumo combustible',
                numFactura: `F-${1000 + rand(1, 999)}`,
                fechaConsumo: fc, registradoPor: operadores[ei].id,
                status: cStatus, ref: genRef('CONS'),
              },
            });
          }
        }
      }

      // 2-4 pagos
      const ctrsVig = await prisma.contrato.findMany({
        where: { clienteId: cli.id, status: 'VIGENTE' },
      });
      if (ctrsVig.length > 0) {
        const nPag = rand(2, 4);
        for (let p = 0; p < nPag; p++) {
          const monto = rand(500000, 3500000);
          const fp = new Date(hoy.getTime() - Math.random() * 50 * 86400000);
          await prisma.pago.create({
            data: {
              estacionId: est.id, clienteId: cli.id, contratoId: ctrsVig[0].id,
              monto, metodo: ['TRANSFERENCIA', 'DEPOSITO', 'CHEQUE', 'EFECTIVO'][rand(0, 3)],
              refBancaria: `REF-${rand(100000, 999999)}`,
              fechaDeposito: fp, registradoPor: operadores[ei].id,
              status: 'CONFIRMADO', comprobante: `Comp_${p + 1}.pdf`,
            },
          });
        }
      }
    }
  }

  // Audit logs
  console.log('Creando logs de auditoria...');
  await prisma.auditLog.create({
    data: { tipo: 'system', desc: 'Sistema inicializado con datos de ejemplo', userName: 'Sistema' },
  });

  // Stats
  const stats = await Promise.all([
    prisma.estacion.count(),
    prisma.usuario.count(),
    prisma.cliente.count(),
    prisma.contrato.count(),
    prisma.consumo.count(),
    prisma.pago.count(),
  ]);

  console.log('\n=== Seed completado ===');
  console.log(`  Estaciones: ${stats[0]}`);
  console.log(`  Usuarios:   ${stats[1]}`);
  console.log(`  Clientes:   ${stats[2]}`);
  console.log(`  Contratos:  ${stats[3]}`);
  console.log(`  Consumos:   ${stats[4]}`);
  console.log(`  Pagos:      ${stats[5]}`);
  console.log('\nCredenciales de prueba:');
  console.log('  Admin:    admin@gap.com.mx / Admin123!');
  console.log('  Operador: luis.gonzalez@gap.com.mx / Oper1234!\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
