// Términos que no se permiten en nombres ni apodos. Se escriben en minúsculas y sin tildes; el filtro
// (nombres.ts) normaliza el texto de la persona antes de comparar. Cada lista compara palabras completas.
// Solo FRAGMENTOS se busca dentro de otras palabras: son términos inequívocos que no aparecen en nombres reales.

export const INSULTOS_ES = [
  'puta', 'puto', 'putas', 'putos', 'putita', 'putito', 'putona', 'puton', 'putisima', 'putazo',
  'pendejo', 'pendeja', 'pendejos', 'pendejas', 'pendejada',
  'idiota', 'idiotas', 'imbecil', 'imbeciles', 'estupido', 'estupida', 'tarado', 'tarada', 'tonto', 'tonta',
  'gilipollas', 'gilipolla', 'cabron', 'cabrona', 'cabrones', 'cabronazo',
  'culero', 'culera', 'huevon', 'huevona', 'guevon', 'guevona', 'weon', 'weona', 'aweonao', 'ahueonao', 'webon',
  'gonorrea', 'malparido', 'malparida', 'malparidos', 'hijueputa', 'hijueputas', 'hijodeputa', 'hijaputa',
  'hijoputa', 'hpta', 'hp', 'carechimba', 'careverga', 'caremonda', 'careculo', 'mamaverga', 'mamaguevo',
  'mamahuevo', 'pirobo', 'piroba', 'gueva', 'zorra', 'zorras', 'perra', 'perras', 'bastardo', 'bastarda',
  'mierda', 'mierdas', 'mierdero', 'cagada', 'cagon', 'cagona', 'culiao', 'culiado', 'culiada', 'culiados',
  'conchetumare', 'conchesumadre', 'conchatumadre', 'conchadetumadre', 'verga', 'vergas', 'vergazo',
  'chinga', 'chingada', 'chingado', 'chingatumadre', 'chingadamadre', 'chingon', 'ojete', 'mamon', 'mamona',
  'pajero', 'pajera', 'boludo', 'boluda', 'pelotudo', 'pelotuda', 'sorete', 'cornudo', 'cornuda',
  'malnacido', 'malnacida', 'monda', 'culo', 'culito', 'culon', 'cono', 'jodete', 'jodido', 'jodida',
  'lameculos', 'soplapollas', 'comemierda', 'tragaleche', 'baboso', 'babosa', 'mamerto', 'gamin',
];

export const SEXUALES_ES = [
  'pene', 'penes', 'polla', 'pollas', 'pija', 'pijudo', 'picha', 'chocho', 'vagina', 'panocha', 'tetas', 'teta',
  'tetona', 'tetudo', 'culona', 'follar', 'follador', 'folladora', 'cogida', 'culear', 'culeada', 'culeador',
  'chupapija', 'chupapolla', 'chupavergas', 'chupaverga', 'sexo', 'sexual', 'porno', 'pornografia', 'orgia',
  'prostituta', 'prostituto', 'ramera', 'zorrita', 'violador', 'violadora', 'violacion', 'pedofilo', 'pedofila',
  'pederasta', 'masturbacion', 'semen', 'esperma', 'clitoris', 'orgasmo', 'mamada', 'chupamela', 'pajuela',
];

export const DISCRIMINATORIOS_ES = [
  'marica', 'maricas', 'maricon', 'maricona', 'maricones', 'marikon', 'joto', 'jotos', 'tortillera',
  'bollera', 'travelo', 'maraco', 'negrata', 'sudaca', 'sudacas', 'mongolico', 'mongolica', 'mogolico',
  'mogolica', 'mongolo', 'retrasado', 'retrasada', 'retardado', 'retardada', 'subnormal', 'subnormales',
  'sidoso', 'sidosa', 'indiamaria', 'veneco', 'venecos', 'machorra', 'mariposon',
];

export const ODIO_ES = [
  'hitler', 'nazi', 'nazis', 'neonazi', 'heilhitler', 'kkk', 'kukluxklan', 'siegheil', 'genocida', 'terrorista',
  'matanegros', 'matajudios', 'mataindios', 'matagays', 'matamaricas', 'supremacista', 'esclavista',
];

export const INSULTS_EN = [
  'fuck', 'fucker', 'fucking', 'fucked', 'motherfucker', 'shit', 'shitty', 'bullshit', 'asshole', 'ass', 'arse',
  'bitch', 'bitches', 'bastard', 'dick', 'dickhead', 'cock', 'cocksucker', 'cunt', 'twat', 'prick', 'pussy',
  'whore', 'slut', 'wanker', 'jerkoff', 'douche', 'douchebag', 'dumbass', 'jackass', 'moron', 'idiot',
  'stupid', 'loser', 'scumbag', 'skank', 'tosser', 'bollocks', 'wtf', 'stfu',
];

export const SEXUAL_EN = [
  'penis', 'boobs', 'tits', 'titties', 'porn', 'pornstar', 'sex', 'sexy', 'horny', 'blowjob', 'handjob', 'cum',
  'cumshot', 'dildo', 'orgasm', 'anal', 'rapist', 'rape', 'pedo', 'pedophile', 'paedophile', 'milf', 'nudes',
  'hooker', 'stripper', 'boner', 'jizz',
];

export const DISCRIMINATORY_EN = [
  'nigger', 'niggers', 'nigga', 'niggas', 'faggot', 'faggots', 'fag', 'dyke', 'tranny', 'chink', 'spic', 'kike',
  'wetback', 'beaner', 'gook', 'coon', 'retard', 'retarded', 'spastic', 'mongoloid', 'raghead', 'towelhead',
  'shemale',
];

export const HATE_EN = ['whitepower', 'whitepride', 'aryan', 'killallblacks', 'gasthejews', 'jihadi'];

// Se buscan también dentro de otras palabras (por ejemplo, "superhijueputa").
export const FRAGMENTOS = [
  'fuck', 'motherfuck', 'nigger', 'nigga', 'faggot', 'cocksuck', 'blowjob', 'cumshot', 'dickhead', 'asshole',
  'bullshit', 'hijueput', 'hijoput', 'hijodeput', 'hijaput', 'malparid', 'gonorre', 'pendej', 'mierd', 'culiad',
  'conchetumar', 'conchesumadre', 'chupapij', 'chupapoll', 'chupaverg', 'mamaverg', 'mamaguev', 'mamahuev',
  'carechimb', 'careverg', 'hitler', 'kukluxklan', 'pedofil', 'pederast', 'porno', 'retrasad', 'retardad',
  'subnormal', 'mongolic', 'mogolic', 'matanegro', 'matajudio', 'whitepower', 'heilhitler', 'siegheil',
];

// Nombres y apellidos reales que coinciden con algún término o lo contienen. Nunca se bloquean.
export const NOMBRES_PERMITIDOS = [
  'dick', 'dickson', 'dickens', 'dickinson', 'dickie', 'cumming', 'cummings', 'concepcion', 'concha', 'conchita',
  'maricela', 'maricarmen', 'maricruz', 'mariconcha', 'hancock', 'peacock', 'babcock', 'wilcox', 'sexton',
  'cassandra', 'assunta', 'pichardo', 'cabrera', 'cagigal', 'putnam', 'putin', 'shitara', 'nazih', 'nazia',
  'anala', 'analia', 'analy',
];

export const TERMINOS_BLOQUEADOS = [
  ...INSULTOS_ES,
  ...SEXUALES_ES,
  ...DISCRIMINATORIOS_ES,
  ...ODIO_ES,
  ...INSULTS_EN,
  ...SEXUAL_EN,
  ...DISCRIMINATORY_EN,
  ...HATE_EN,
];
