import type { Charm, CompanionBones, Eye, Hat, Species } from './types.js'
import {
  axolotl,
  bear,
  bee,
  blob,
  cactus,
  capybara,
  cat,
  chonk,
  crystal,
  dice,
  dog,
  dragon,
  duck,
  fox,
  frog,
  ghost,
  goose,
  hamster,
  jelly,
  koala,
  moon,
  mushroom,
  octopus,
  otter,
  owl,
  penguin,
  rabbit,
  robot,
  seal,
  sheep,
  skull,
  snail,
  turtle,
  voidling,
} from './types.js'

// Each sprite is 5 lines tall, 12 wide (after {E}→1char substitution).
// Multiple frames per species for idle fidget animation.
// Line 0 is the hat slot — must be blank in frames 0-1; frame 2 may use it.
const BODIES: Record<Species, string[][]> = {
  [duck]: [
    [
      '            ',
      '    __      ',
      '  <({E} )___  ',
      '   (  ._>   ',
      '    `--´    ',
    ],
    [
      '            ',
      '    __      ',
      '  <({E} )___  ',
      '   (  ._>   ',
      '    `--´~   ',
    ],
    [
      '            ',
      '    __      ',
      '  <({E} )___  ',
      '   (  .__>  ',
      '    `--´    ',
    ],
  ],
  [goose]: [
    [
      '            ',
      '     ({E}>    ',
      '     ||     ',
      '   _(__)_   ',
      '    ^^^^    ',
    ],
    [
      '            ',
      '    ({E}>     ',
      '     ||     ',
      '   _(__)_   ',
      '    ^^^^    ',
    ],
    [
      '            ',
      '     ({E}>>   ',
      '     ||     ',
      '   _(__)_   ',
      '    ^^^^    ',
    ],
  ],
  [blob]: [
    [
      '            ',
      '   .----.   ',
      '  ( {E}  {E} )  ',
      '  (      )  ',
      '   `----´   ',
    ],
    [
      '            ',
      '  .------.  ',
      ' (  {E}  {E}  ) ',
      ' (        ) ',
      '  `------´  ',
    ],
    [
      '            ',
      '    .--.    ',
      '   ({E}  {E})   ',
      '   (    )   ',
      '    `--´    ',
    ],
  ],
  [cat]: [
    [
      '            ',
      '   /\\_/\\    ',
      '  ( {E}   {E})  ',
      '  (  ω  )   ',
      '  (")_(")   ',
    ],
    [
      '            ',
      '   /\\_/\\    ',
      '  ( {E}   {E})  ',
      '  (  ω  )   ',
      '  (")_(")~  ',
    ],
    [
      '            ',
      '   /\\-/\\    ',
      '  ( {E}   {E})  ',
      '  (  ω  )   ',
      '  (")_(")   ',
    ],
  ],
  [dragon]: [
    [
      '            ',
      '  /^\\  /^\\  ',
      ' <  {E}  {E}  > ',
      ' (   ~~   ) ',
      '  `-vvvv-´  ',
    ],
    [
      '            ',
      '  /^\\  /^\\  ',
      ' <  {E}  {E}  > ',
      ' (        ) ',
      '  `-vvvv-´  ',
    ],
    [
      '   ~    ~   ',
      '  /^\\  /^\\  ',
      ' <  {E}  {E}  > ',
      ' (   ~~   ) ',
      '  `-vvvv-´  ',
    ],
  ],
  [octopus]: [
    [
      '            ',
      '   .----.   ',
      '  ( {E}  {E} )  ',
      '  (______)  ',
      '  /\\/\\/\\/\\  ',
    ],
    [
      '            ',
      '   .----.   ',
      '  ( {E}  {E} )  ',
      '  (______)  ',
      '  \\/\\/\\/\\/  ',
    ],
    [
      '     o      ',
      '   .----.   ',
      '  ( {E}  {E} )  ',
      '  (______)  ',
      '  /\\/\\/\\/\\  ',
    ],
  ],
  [owl]: [
    [
      '            ',
      '   /\\  /\\   ',
      '  (({E})({E}))  ',
      '  (  ><  )  ',
      '   `----´   ',
    ],
    [
      '            ',
      '   /\\  /\\   ',
      '  (({E})({E}))  ',
      '  (  ><  )  ',
      '   .----.   ',
    ],
    [
      '            ',
      '   /\\  /\\   ',
      '  (({E})(-))  ',
      '  (  ><  )  ',
      '   `----´   ',
    ],
  ],
  [penguin]: [
    [
      '            ',
      '  .---.     ',
      '  ({E}>{E})     ',
      ' /(   )\\    ',
      '  `---´     ',
    ],
    [
      '            ',
      '  .---.     ',
      '  ({E}>{E})     ',
      ' |(   )|    ',
      '  `---´     ',
    ],
    [
      '  .---.     ',
      '  ({E}>{E})     ',
      ' /(   )\\    ',
      '  `---´     ',
      '   ~ ~      ',
    ],
  ],
  [turtle]: [
    [
      '            ',
      '   _,--._   ',
      '  ( {E}  {E} )  ',
      ' /[______]\\ ',
      '  ``    ``  ',
    ],
    [
      '            ',
      '   _,--._   ',
      '  ( {E}  {E} )  ',
      ' /[______]\\ ',
      '   ``  ``   ',
    ],
    [
      '            ',
      '   _,--._   ',
      '  ( {E}  {E} )  ',
      ' /[======]\\ ',
      '  ``    ``  ',
    ],
  ],
  [snail]: [
    [
      '            ',
      ' {E}    .--.  ',
      '  \\  ( @ )  ',
      '   \\_`--´   ',
      '  ~~~~~~~   ',
    ],
    [
      '            ',
      '  {E}   .--.  ',
      '  |  ( @ )  ',
      '   \\_`--´   ',
      '  ~~~~~~~   ',
    ],
    [
      '            ',
      ' {E}    .--.  ',
      '  \\  ( @  ) ',
      '   \\_`--´   ',
      '   ~~~~~~   ',
    ],
  ],
  [ghost]: [
    [
      '            ',
      '   .----.   ',
      '  / {E}  {E} \\  ',
      '  |      |  ',
      '  ~`~``~`~  ',
    ],
    [
      '            ',
      '   .----.   ',
      '  / {E}  {E} \\  ',
      '  |      |  ',
      '  `~`~~`~`  ',
    ],
    [
      '    ~  ~    ',
      '   .----.   ',
      '  / {E}  {E} \\  ',
      '  |      |  ',
      '  ~~`~~`~~  ',
    ],
  ],
  [axolotl]: [
    [
      '            ',
      '}~(______)~{',
      '}~({E} .. {E})~{',
      '  ( .--. )  ',
      '  (_/  \\_)  ',
    ],
    [
      '            ',
      '~}(______){~',
      '~}({E} .. {E}){~',
      '  ( .--. )  ',
      '  (_/  \\_)  ',
    ],
    [
      '            ',
      '}~(______)~{',
      '}~({E} .. {E})~{',
      '  (  --  )  ',
      '  ~_/  \\_~  ',
    ],
  ],
  [capybara]: [
    [
      '            ',
      '  n______n  ',
      ' ( {E}    {E} ) ',
      ' (   oo   ) ',
      '  `------´  ',
    ],
    [
      '            ',
      '  n______n  ',
      ' ( {E}    {E} ) ',
      ' (   Oo   ) ',
      '  `------´  ',
    ],
    [
      '    ~  ~    ',
      '  u______n  ',
      ' ( {E}    {E} ) ',
      ' (   oo   ) ',
      '  `------´  ',
    ],
  ],
  [cactus]: [
    [
      '            ',
      ' n  ____  n ',
      ' | |{E}  {E}| | ',
      ' |_|    |_| ',
      '   |    |   ',
    ],
    [
      '            ',
      '    ____    ',
      ' n |{E}  {E}| n ',
      ' |_|    |_| ',
      '   |    |   ',
    ],
    [
      ' n        n ',
      ' |  ____  | ',
      ' | |{E}  {E}| | ',
      ' |_|    |_| ',
      '   |    |   ',
    ],
  ],
  [robot]: [
    [
      '            ',
      '   .[||].   ',
      '  [ {E}  {E} ]  ',
      '  [ ==== ]  ',
      '  `------´  ',
    ],
    [
      '            ',
      '   .[||].   ',
      '  [ {E}  {E} ]  ',
      '  [ -==- ]  ',
      '  `------´  ',
    ],
    [
      '     *      ',
      '   .[||].   ',
      '  [ {E}  {E} ]  ',
      '  [ ==== ]  ',
      '  `------´  ',
    ],
  ],
  [rabbit]: [
    [
      '            ',
      '   (\\__/)   ',
      '  ( {E}  {E} )  ',
      ' =(  ..  )= ',
      '  (")__(")  ',
    ],
    [
      '            ',
      '   (|__/)   ',
      '  ( {E}  {E} )  ',
      ' =(  ..  )= ',
      '  (")__(")  ',
    ],
    [
      '            ',
      '   (\\__/)   ',
      '  ( {E}  {E} )  ',
      ' =( .  . )= ',
      '  (")__(")  ',
    ],
  ],
  [mushroom]: [
    [
      '            ',
      ' .-o-OO-o-. ',
      '(__________)',
      '   |{E}  {E}|   ',
      '   |____|   ',
    ],
    [
      '            ',
      ' .-O-oo-O-. ',
      '(__________)',
      '   |{E}  {E}|   ',
      '   |____|   ',
    ],
    [
      '   . o  .   ',
      ' .-o-OO-o-. ',
      '(__________)',
      '   |{E}  {E}|   ',
      '   |____|   ',
    ],
  ],
  [fox]: [
    [
      '            ',
      '    /\\_/\\   ',
      '   ( {E} {E} ) ',
      '   (  ω  )  ',
      '   /|  |\\   ',
    ],
    [
      '            ',
      '    /\\_/\\   ',
      '   ( {E} {E} ) ',
      '   (  ω  )  ',
      '    |\\ /|   ',
    ],
    [
      '   ~        ',
      '    /\\_/\\   ',
      '   ( {E} {E} ) ',
      '   (  ω  )  ',
      '   /|  |\\   ',
    ],
  ],
  [frog]: [
    [
      '            ',
      '   @    @   ',
      '  ( {E}  {E} )',
      '   \\====/   ',
      '   ^^  ^^   ',
    ],
    [
      '            ',
      '   @    @   ',
      '  ( {E}  {E} )',
      '   \\-==-/   ',
      '   ^^  ^^   ',
    ],
    [
      '            ',
      '  @      @  ',
      '  ( {E}  {E} )',
      '   \\====/   ',
      '  ^^    ^^  ',
    ],
  ],
  [seal]: [
    [
      '            ',
      '   .----.   ',
      '  (_{E}..{E}_)',
      '   \\~~~~/   ',
      '    `````   ',
    ],
    [
      '            ',
      '   .----.   ',
      '  (_{E}..{E}_)',
      '   \\~~~´/   ',
      '    ``´´´   ',
    ],
    [
      '     ~      ',
      '   .----.   ',
      '  (_{E}..{E}_)',
      '   \\~~~~/   ',
      '    `````   ',
    ],
  ],
  [bee]: [
    [
      '            ',
      '    *  *    ',
      '   ({E}{E})   ',
      '  /|====|\\ ',
      '   \\|  |/  ',
    ],
    [
      '            ',
      '    *  *    ',
      '   ({E}{E})   ',
      '  /|-==-|\\ ',
      '   \\|  |/  ',
    ],
    [
      '      ~     ',
      '    *  *    ',
      '   ({E}{E})   ',
      '  /|====|\\ ',
      '   \\|  |/  ',
    ],
  ],
  [bear]: [
    [
      '            ',
      '  (\\_/)(\\_/) ',
      ' ( {E}  {E}  )',
      '  (  ..  )  ',
      ' ((    ))  ',
    ],
    [
      '            ',
      '  (|_/)(\\_/)',
      ' ( {E}  {E}  )',
      '  (  ..  )  ',
      ' ((    ))  ',
    ],
    [
      '            ',
      '  (\\_/)(\\_/)',
      ' ( {E}  {E}  )',
      '  ( .  . )  ',
      ' ((    ))  ',
    ],
  ],
  [hamster]: [
    [
      '            ',
      '  oo    oo  ',
      '  ( {E}  {E} )  ',
      '  (  ..  )  ',
      '   UU  UU   ',
    ],
    [
      '            ',
      ' ~oo    oo  ',
      '  ( {E}  {E} )  ',
      '  (  ..  )  ',
      '   UU  UU   ',
    ],
    [
      '            ',
      '  oo    oo~ ',
      '  ( {E}  {E} )  ',
      '  (  ..  )  ',
      '   UU  UU   ',
    ],
  ],
  [dog]: [
    [
      '            ',
      '  /\\    /\\  ',
      '  ( {E}  {E} )  ',
      '  (  ω  )   ',
      '   /|  |\\   ',
    ],
    [
      '            ',
      '   /\\  /\\   ',
      '  ( {E}  {E} )  ',
      '  (  ω  )   ',
      '    u  u    ',
    ],
    [
      '            ',
      '  /\\    /\\  ',
      '  ( {E}  {E} )  ',
      '  (  ω  ) ~ ',
      '   /|  |\\   ',
    ],
  ],
  [koala]: [
    [
      '            ',
      ' (o)    (o) ',
      '  ( {E}  {E} )  ',
      '   (  ·  )  ',
      '   /|  |\\   ',
    ],
    [
      '            ',
      '( o)    (o) ',
      '  ( {E}  {E} )  ',
      '   (  ·  )  ',
      '   /|  |\\   ',
    ],
    [
      '            ',
      ' (o)    (o) ',
      '  ( {E}  {E} )  ',
      '   (  ·  )  ',
      '   /|  |\\ ~ ',
    ],
  ],
  [sheep]: [
    [
      '            ',
      '  ~~~~~~~~  ',
      '  ( {E}  {E} )  ',
      '   ( oo )   ',
      '    |  |    ',
    ],
    [
      '            ',
      ' ~~~~~~~~~  ',
      '  ( {E}  {E} )  ',
      '   ( oo )   ',
      '    |  |    ',
    ],
    [
      '            ',
      '  ~~~~~~~~~ ',
      '  ( {E}  {E} )  ',
      '   ( oo )   ',
      '    |  |    ',
    ],
  ],
  [otter]: [
    [
      '            ',
      '   .-----   ',
      '  ( {E}  {E} )  ',
      '  (  ~~  )  ',
      '   \\^|^/   ',
    ],
    [
      '            ',
      '  ..-----   ',
      '  ( {E}  {E} )  ',
      '  (  ~~  )  ',
      '   \\^|^/   ',
    ],
    [
      '            ',
      '   .-----   ',
      '  ( {E}  {E} )  ',
      '  (  ~~  ) ~',
      '   \\^|^/   ',
    ],
  ],
  [jelly]: [
    [
      '            ',
      '   .~~~~.   ',
      '  ( {E}  {E} )  ',
      '   ~~~~~~   ',
      '   \\|  |/   ',
    ],
    [
      '            ',
      '  .~~~~~~.  ',
      '  ( {E}  {E} )  ',
      '   ~~~~~~   ',
      '  \\|    |/  ',
    ],
    [
      '            ',
      '   .~~~~.   ',
      '  ( {E}  {E} )  ',
      '   ~~~~~~   ',
      '   ~|  |~   ',
    ],
  ],
  [chonk]: [
    [
      '            ',
      '  /\\    /\\  ',
      ' ( {E}    {E} ) ',
      ' (   ..   ) ',
      '  `------´  ',
    ],
    [
      '            ',
      '  /\\    /|  ',
      ' ( {E}    {E} ) ',
      ' (   ..   ) ',
      '  `------´  ',
    ],
    [
      '            ',
      '  /\\    /\\  ',
      ' ( {E}    {E} ) ',
      ' (   ..   ) ',
      '  `------´~ ',
    ],
  ],
  [skull]: [
    [
      '            ',
      '    ____    ',
      '   / {E} {E} \\  ',
      '   \\____/   ',
      '    |  |    ',
    ],
    [
      '            ',
      '    ____    ',
      '   / {E} {E} \\  ',
      '   \\~~~~/   ',
      '   /|  |\\   ',
    ],
    [
      '            ',
      '   ____     ',
      '   / {E} {E} \\  ',
      '   \\____/   ',
      '    |  |~   ',
    ],
  ],
  [moon]: [
    [
      '            ',
      '     .-)    ',
      '    /   \\   ',
      '    ( {E} )   ',
      "    '---'   ",
    ],
    [
      '            ',
      '    .-)     ',
      '   /   \\    ',
      '    ( {E} )   ',
      "    '---'~  ",
    ],
    [
      '            ',
      '     .-)    ',
      '    /   \\   ',
      '    ( {E} )   ',
      "    '--´    ",
    ],
  ],
  [crystal]: [
    [
      '            ',
      '      /\\    ',
      '     /{E}\\    ',
      '     \\|/    ',
      '     |      ',
    ],
    [
      '            ',
      '      /\\    ',
      '    / {E}\\    ',
      '     \\|/    ',
      '     |      ',
    ],
    [
      '            ',
      '      /\\    ',
      '     /{E}\\    ',
      '     \\|/    ',
      '     |~     ',
    ],
  ],
  [dice]: [
    [
      '            ',
      '   +------+ ',
      '   | o  o | ',
      '  |   {E}   | ',
      '   +------+ ',
    ],
    [
      '            ',
      '   +------+ ',
      '   |o    o| ',
      '  |   {E}   | ',
      '   +------+ ',
    ],
    [
      '            ',
      '   +------+ ',
      '   |  o o | ',
      '  |   {E}   | ',
      '   +------+ ',
    ],
  ],
  [voidling]: [
    [
      '            ',
      '     :      ',
      '    /·\\     ',
      '    ( {E} )   ',
      '    \\·/     ',
    ],
    [
      '            ',
      '    :  :    ',
      '   /···\\    ',
      '  (  {E}  )   ',
      '   \\···/    ',
    ],
    [
      '            ',
      '     :      ',
      '    /·\\     ',
      '    ( {E} )   ',
      '    \\·/~    ',
    ],
  ],
}

const HAT_LINES: Record<Hat, string> = {
  none: '',
  crown: '   \\^^^/    ',
  tophat: '   [___]    ',
  propeller: '    -+-     ',
  halo: '   (   )    ',
  wizard: '    /^\\     ',
  beanie: '   (___)    ',
  tinyduck: '    ,>      ',
  headphones: ' [o][o]    ',
  beret: '  (~~~~)   ',
  antenna: '    !|     ',
  heartpin: '    <3     ',
  sprout: '    @/     ',
  bowhat: '   (@@)    ',
  visor: '  [===]   ',
}

const CHARM_LINES: Record<Charm, string> = {
  none: '',
}

export type SpriteRenderMeta = {
  lines: string[]
  /** 在 `lines` 中的下标；本帧未画出帽子（如烟缕占用顶行）时为 null */
  hatLineIndex: number | null
}

export function renderSpriteWithMeta(
  bones: CompanionBones,
  frame = 0,
  /** 仅替换 `{E}` 占位，避免误伤鼻头等与眼睛同字符的装饰（如考拉 `·`） */
  blink = false,
): SpriteRenderMeta {
  const frames = BODIES[bones.species]
  const eyeOut = blink ? '-' : bones.eye
  const body = frames[frame % frames.length]!.map(line =>
    line.replaceAll('{E}', eyeOut),
  )
  const lines = [...body]
  let hatLineIndex: number | null = null
  // Only replace with hat if line 0 is empty (some fidget frames use it for smoke etc)
  if (bones.hat !== 'none' && !lines[0]!.trim()) {
    lines[0] = HAT_LINES[bones.hat]
    hatLineIndex = 0
  }
  // Drop blank hat slot — wastes a row in the Card and ambient sprite when
  // there's no hat and the frame isn't using it for smoke/antenna/etc.
  // Only safe when ALL frames have blank line 0; otherwise heights oscillate.
  if (!lines[0]!.trim() && frames.every(f => !f[0]!.trim())) lines.shift()
  if (bones.charm !== 'none') lines.push(CHARM_LINES[bones.charm])
  return { lines, hatLineIndex }
}

export function renderSprite(
  bones: CompanionBones,
  frame = 0,
  blink = false,
): string[] {
  return renderSpriteWithMeta(bones, frame, blink).lines
}

export function spriteFrameCount(species: Species): number {
  return BODIES[species].length
}

export function renderFace(bones: CompanionBones): string {
  const eye: Eye = bones.eye
  switch (bones.species) {
    case duck:
    case goose:
      return `(${eye}>`
    case blob:
      return `(${eye}${eye})`
    case cat:
      return `=${eye}ω${eye}=`
    case dragon:
      return `<${eye}~${eye}>`
    case octopus:
      return `~(${eye}${eye})~`
    case owl:
      return `(${eye})(${eye})`
    case penguin:
      return `(${eye}>)`
    case turtle:
      return `[${eye}_${eye}]`
    case snail:
      return `${eye}(@)`
    case ghost:
      return `/${eye}${eye}\\`
    case axolotl:
      return `}${eye}.${eye}{`
    case capybara:
      return `(${eye}oo${eye})`
    case cactus:
      return `|${eye}  ${eye}|`
    case robot:
      return `[${eye}${eye}]`
    case rabbit:
      return `(${eye}..${eye})`
    case mushroom:
      return `|${eye}  ${eye}|`
    case fox:
      return `/${eye}ω${eye}\\`
    case frog:
      return `(${eye}~${eye})`
    case seal:
      return `_${eye}..${eye}_`
    case bee:
      return `*${eye}${eye}*`
    case bear:
      return `(${eye}..${eye})`
    case hamster:
      return `:${eye}..${eye}:`
    case dog:
      return `=${eye}ω${eye}=`
    case koala:
      return `(${eye}·${eye})`
    case sheep:
      return `(${eye}oo${eye})`
    case otter:
      return `_${eye}~~${eye}_`
    case jelly:
      return `~${eye} ${eye}~`
    case chonk:
      return `(${eye}.${eye})`
    case voidling:
      return `·${eye}·`
    case skull:
      return `:${eye}${eye}:`
    case moon:
      return `(${eye})`
    case crystal:
      return `◆${eye}`
    case dice:
      return `[${eye}]`
  }
}
