const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const REAL_STATIONS = [
  { cuenta: '0209499429', nombre: 'ABEIRA', clabe: '072420002094994291' },
  { cuenta: '0548154717', nombre: 'ALISAS', clabe: '072441005481547172' },
  { cuenta: '0567480930', nombre: 'ALPES', clabe: '072441005674809300' },
  { cuenta: '0551756755', nombre: 'ASUNCION', clabe: '072441005517567550' },
  { cuenta: '0202541169', nombre: 'CAMTOS', clabe: '072420002025411691' },
  { cuenta: '1019212011', nombre: 'CAP ALMOLOYA', clabe: '072420010192120111' },
  { cuenta: '1088347021', nombre: 'CAP ATLACOMULCO', clabe: '072420010883470219' },
  { cuenta: '1088046481', nombre: 'CAP AVANDARO', clabe: '072420010880464817' },
  { cuenta: '1248285459', nombre: 'CAP IXTAPAN', clabe: '072420012482854593' },
  { cuenta: '1088354298', nombre: 'CAP JOCOTITLAN', clabe: '072420010883542985' },
  { cuenta: '1088341926', nombre: 'CAP SAN LUIS', clabe: '072420010883419267' },
  { cuenta: '1088365445', nombre: 'CAP SAN MATEO', clabe: '072420010883654459' },
  { cuenta: '1088358803', nombre: 'CAP SANTA CRUZ', clabe: '072420010883588033' },
  { cuenta: '1088364121', nombre: 'CAP TENANGO', clabe: '072420010883641213' },
  { cuenta: '1088366639', nombre: 'CAP TONATICO', clabe: '072420010883666395' },
  { cuenta: '1088367944', nombre: 'CAP VALLE DE BRAVO', clabe: '072420010883679447' },
  { cuenta: '1088368820', nombre: 'CAP VILLA DE ALLENDE', clabe: '072420010883688205' },
  { cuenta: '1088370421', nombre: 'CAP ZITACUARO', clabe: '072420010883704215' },
  { cuenta: '1088369667', nombre: 'CAP ZONA INDUSTRIAL', clabe: '072420010883696679' },
  { cuenta: '0567480828', nombre: 'CARRETERO', clabe: '072441005674808288' },
  { cuenta: '0871732626', nombre: 'CHALCO', clabe: '072420008717326263' },
  { cuenta: '0206255240', nombre: 'COTERON', clabe: '072420002062552403' },
  { cuenta: '0859436173', nombre: 'CUEXOCH', clabe: '072420008594361739' },
  { cuenta: '0156466673', nombre: 'DASS', clabe: '072434001564666732' },
  { cuenta: '0171521959', nombre: 'DUAL', clabe: '072441001715219594' },
  { cuenta: '0278556944', nombre: 'DUERO', clabe: '072420002785569443' },
  { cuenta: '0316258962', nombre: 'EJE 10', clabe: '072420003162589621' },
  { cuenta: '0266466880', nombre: 'ENCINOS', clabe: '072420002664668805' },
  { cuenta: '0672997220', nombre: 'ENERGIA', clabe: '072441006729972204' },
  { cuenta: '0847322367', nombre: 'GERITON', clabe: '072420008473223671' },
  { cuenta: '0831426040', nombre: 'HIDALGO', clabe: '072420008314260405' },
  { cuenta: '0672997190', nombre: 'IXTAPALGAS', clabe: '072441006729971904' },
  { cuenta: '0582208838', nombre: 'IXTLAHUACA', clabe: '072441005822088384' },
  { cuenta: '0474683129', nombre: 'JANVAL', clabe: '072420004746831299' },
  { cuenta: '0171521744', nombre: 'MARALVA', clabe: '072441001715217444' },
  { cuenta: '1245299491', nombre: 'MARINAS', clabe: '072420012452994917' },
  { cuenta: '0568031991', nombre: 'MONROY', clabe: '072420005680319915' },
  { cuenta: '0280004995', nombre: 'NEVADO', clabe: '072441002800049953' },
  { cuenta: '0530128272', nombre: 'NINFAS', clabe: '072441005301282724' },
  { cuenta: '0187326155', nombre: 'ORDAZ', clabe: '072420001873261557' },
  { cuenta: '0802777724', nombre: 'PAL', clabe: '072441008027777248' },
  { cuenta: '1234654115', nombre: 'PATZCUARO', clabe: '072420012346541159' },
  { cuenta: '0439835936', nombre: 'PLAZAS AP I', clabe: '072420004398359365' },
  { cuenta: '0679206743', nombre: 'PLAZAS AP II', clabe: '072441006792067434' },
  { cuenta: '0865726398', nombre: 'PONTEVEDRA', clabe: '072420008657263981' },
  { cuenta: '0602162968', nombre: 'PORTILLO', clabe: '072441006021629682' },
  { cuenta: '0835221234', nombre: 'SERMATO', clabe: '072441008352212342' },
  { cuenta: '0182830657', nombre: 'TEC', clabe: '072441001828306572' },
  { cuenta: '0104657128', nombre: 'TENANCINGO', clabe: '072450001046571280' },
  { cuenta: '0887466221', nombre: 'TEZA', clabe: '072420008874662213' },
  { cuenta: '0504038354', nombre: 'TOLCAYUCA', clabe: '072290005040383546' },
  { cuenta: '0859436191', nombre: 'TOSCAM', clabe: '072420008594361917' },
  { cuenta: '1146196624', nombre: 'TULYEHUALCO', clabe: '072420011461966241' },
  { cuenta: '1269224640', nombre: 'VASA HERIBERTO', clabe: '072420012692246409' },
  { cuenta: '1269288334', nombre: 'VASA METEPEC', clabe: '072420012692883341' },
  { cuenta: '1269230520', nombre: 'VASA OCOTITLAN', clabe: '072420012692305201' },
  { cuenta: '0148961771', nombre: 'VILLA', clabe: '072450001489617714' },
  { cuenta: '0648419222', nombre: 'ZINA', clabe: '072441006484192222' },
];

function getEstadoForStation(nombre) {
  if (nombre.startsWith('CAP ')) return 'Edo. Mexico';
  if (['EJE 10', 'TULYEHUALCO', 'CHALCO'].includes(nombre)) return 'CDMX';
  return 'Mexico';
}

function getCiudadForStation(nombre) {
  const mapping = {
    'ABEIRA': 'Toluca',
    'ALISAS': 'Toluca',
    'ALPES': 'Toluca',
    'ASUNCION': 'Toluca',
    'CAMTOS': 'Toluca',
    'CAP ALMOLOYA': 'Almoloya',
    'CAP ATLACOMULCO': 'Atlacomulco',
    'CAP AVANDARO': 'Avandaro',
    'CAP IXTAPAN': 'Ixtapan',
    'CAP JOCOTITLAN': 'Jocotitlan',
    'CAP SAN LUIS': 'San Luis',
    'CAP SAN MATEO': 'San Mateo',
    'CAP SANTA CRUZ': 'Santa Cruz',
    'CAP TENANGO': 'Tenango',
    'CAP TONATICO': 'Tonatico',
    'CAP VALLE DE BRAVO': 'Valle de Bravo',
    'CAP VILLA DE ALLENDE': 'Villa de Allende',
    'CAP ZITACUARO': 'Zitacuaro',
    'CAP ZONA INDUSTRIAL': 'Zona Industrial',
    'CARRETERO': 'Toluca',
    'CHALCO': 'Chalco',
    'COTERON': 'Toluca',
    'CUEXOCH': 'Toluca',
    'DASS': 'Toluca',
    'DUAL': 'Toluca',
    'DUERO': 'Toluca',
    'EJE 10': 'Mexico City',
    'ENCINOS': 'Toluca',
    'ENERGIA': 'Toluca',
    'GERITON': 'Toluca',
    'HIDALGO': 'Toluca',
    'IXTAPALGAS': 'Toluca',
    'IXTLAHUACA': 'Ixtlahuaca',
    'JANVAL': 'Toluca',
    'MARALVA': 'Toluca',
    'MARINAS': 'Marinas',
    'MONROY': 'Toluca',
    'NEVADO': 'Toluca',
    'NINFAS': 'Toluca',
    'ORDAZ': 'Toluca',
    'PAL': 'Toluca',
    'PATZCUARO': 'Patzcuaro',
    'PLAZAS AP I': 'Toluca',
    'PLAZAS AP II': 'Toluca',
    'PONTEVEDRA': 'Toluca',
    'PORTILLO': 'Toluca',
    'SERMATO': 'Toluca',
    'TEC': 'Toluca',
    'TENANCINGO': 'Tenancingo',
    'TEZA': 'Toluca',
    'TOLCAYUCA': 'Tolcayuca',
    'TOSCAM': 'Toluca',
    'TULYEHUALCO': 'Tulyehualco',
    'VASA HERIBERTO': 'Heriberto',
    'VASA METEPEC': 'Metepec',
    'VASA OCOTITLAN': 'Ocotitlan',
    'VILLA': 'Villa',
    'ZINA': 'Toluca',
  };
  return mapping[nombre] || nombre;
}

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
  console.log('Creando 59 estaciones...');
  const estaciones = [];
  for (let i = 0; i < REAL_STATIONS.length; i++) {
    const stationData = REAL_STATIONS[i];
    const num = 'EST-' + String(i + 1).padStart(4, '0');
    const estado = getEstadoForStation(stationData.nombre);
    const ciudad = getCiudadForStation(stationData.nombre);

    const est = await prisma.estacion.create({
      data: {
        nombre: stationData.nombre,
        num,
        ciudad,
        estado,
        razonSocial: `Estacion ${stationData.nombre} SA de CV`,
        rfc: `EST${String(i + 1).padStart(5, '0')}ABC`,
        domicilio: `Av. Principal #${rand(1000, 9999)}, Col. Centro`,
        cp: String(rand(10000, 99999)),
        banco: 'Banorte',
        cuenta: stationData.cuenta,
        clabe: stationData.clabe,
        beneficiario: stationData.nombre,
        contactoNombre: CONTACTOS[i % CONTACTOS.length],
        contactoTel: `${rand(5500000000, 5599999999)}`,
        contactoEmail: `${stationData.nombre.toLowerCase().replace(/ /g, '')}@banorte.com.mx`,
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

  // Clientes, Contratos, Consumos, Pagos (solo para las primeras 10 estaciones)
  console.log('Creando clientes, contratos, consumos y pagos para las primeras 10 estaciones...');
  const hoy = new Date();
  let empIdx = 0;

  for (let ei = 0; ei < 10; ei++) {
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
          telefono: `${rand(5500000000, 5599999999)}`,
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
  console.log(`  Estaciones: ${stats[0]} (59 estaciones Banorte)`);
  console.log(`  Usuarios:   ${stats[1]} (2 admin + 10 operadores)`);
  console.log(`  Clientes:   ${stats[2]} (primeras 10 estaciones)`);
  console.log(`  Contratos:  ${stats[3]} (primeras 10 estaciones)`);
  console.log(`  Consumos:   ${stats[4]} (primeras 10 estaciones)`);
  console.log(`  Pagos:      ${stats[5]} (primeras 10 estaciones)`);
  console.log('\nCredenciales de prueba:');
  console.log('  Admin:    admin@gap.com.mx / Admin123!');
  console.log('  Operador: luis.gonzalez@gap.com.mx / Oper1234!\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
