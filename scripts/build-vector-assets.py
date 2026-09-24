"""Rebuild original code-native cup, water, effect and UI SVG assets."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / 'assets'
INK = '#493c32'
entries = []

def svg(name, w, h, label, body, **metadata):
    path = A / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{label}"><g stroke="{INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">{body}</g></svg>\n')
    entries.append(dict(id=path.stem, path=name, width=w, height=h, type='svg', **metadata))

for name, color in [('sunny','#f5ca62'),('coral','#f29b89'),('sky','#a3d9e8')]:
    svg(f'props/cup-{name}.svg',128,144,'투명한 컵 외곽',f'<path d="M92 45 C132 36 132 106 94 105 L94 91 C113 91 116 56 94 59" fill="{color}"/><path d="M16 29 L23 125 Q55 134 87 125 L94 29" fill="{color}" fill-opacity=".15"/><path d="M16 29 L23 125 Q55 134 87 125 L94 29" fill="none"/><ellipse cx="55" cy="29" rx="39" ry="9" fill="{color}"/><path d="M28 47 L32 108" stroke="white" stroke-width="5" opacity=".85"/>', anchor=[55,29], interior={'x':25,'y':40,'width':60,'height':82})
svg('props/cup-water-fill.svg',128,144,'컵 안의 물', '<defs><clipPath id="inside"><path d="M21 40 H89 L83 122 Q55 129 27 122 Z"/></clipPath></defs><g clip-path="url(#inside)" stroke="none"><path d="M15 70 Q35 62 55 70 T100 70 V132 H15 Z" fill="#70cbe6"/><path d="M23 78 Q39 71 54 78 T88 78" fill="none" stroke="#d6f7ff" stroke-width="3"/></g>')
svg('props/faucet.svg',160,128,'물줄기를 옮기는 수도꼭지','<path d="M8 53 H73 Q105 53 105 82 V97 H143 V79 Q143 22 87 22 H8 Z" fill="#a3d9e8"/><path d="M71 23 V10 M52 10 H91"/><path d="M101 96 H147 V110 H101 Z" fill="#f5ca62"/><path d="M18 36 H78" stroke="white" stroke-width="5"/>',anchor=[124,110])
for kind,color,light in [('clean','#70cbe6','#d6f7ff'),('dirty','#b58a60','#ead6a4')]:
    svg(f'fx/drop-{kind}.svg',64,80,'맑은 물방울' if kind=='clean' else '똥물 방울', f'<path d="M32 7 C27 24 10 36 10 51 C10 79 55 79 55 51 C55 35 37 20 32 7Z" fill="{color}"/><path d="M23 46 Q18 57 28 62" fill="none" stroke="{light}"/>' + ('<circle cx="39" cy="46" r="4" fill="#ead6a4" stroke="none"/><circle cx="40" cy="59" r="2" fill="#493c32" stroke="none"/>' if kind=='dirty' else ''))
    svg(f'fx/stream-{kind}.svg',64,256,'장식용 물줄기',f'<path d="M17 0 Q9 32 19 64 T18 128 T18 192 T18 256 H46 Q56 224 46 192 T46 128 T46 64 T46 0Z" fill="{color}" stroke="none"/><path d="M27 7 Q20 36 29 62" fill="none" stroke="{light}"/>' + f'<path d="M28 92 Q20 124 29 149 M28 177 Q20 206 29 235" stroke="{light}" fill="none"/>',usage='decoration only; draw discrete packets for gameplay')
    svg(f'fx/splash-{kind}.svg',160,80,'물이 튀는 효과',f'<path d="M14 65 Q41 48 32 26 Q49 30 61 53 Q67 24 82 10 Q96 29 93 52 Q123 28 137 32 Q119 50 145 65 Q85 78 14 65Z" fill="{color}"/><path d="M11 24 L6 15 M145 14 L153 8" stroke="{color}" stroke-width="7"/>')
svg('ui/dirty-warning.svg',80,80,'똥물 경고','<path d="M40 7 Q44 7 47 13 L74 62 Q78 72 66 72 H14 Q2 72 7 62 L33 13 Q36 7 40 7Z" fill="#f5ca62"/><path d="M40 28 V46" stroke-width="7"/><circle cx="40" cy="59" r="4" fill="#493c32" stroke="none"/>')
svg('ui/dirty-action.svg',80,80,'똥물 사용','<path d="M40 9 C37 25 16 37 16 53 C16 80 66 77 66 52 C66 35 47 25 40 9Z" fill="#b58a60"/><circle cx="32" cy="49" r="3" fill="#493c32"/><circle cx="50" cy="49" r="3" fill="#493c32"/><path d="M33 61 Q42 66 51 60" fill="none"/>')
for direction,path in [('left','M48 18 L24 40 L48 62Z'),('center','M23 40 A17 17 0 1 0 57 40 A17 17 0 1 0 23 40'),('right','M32 18 L56 40 L32 62Z')]:
    svg(f'ui/lane-{direction}.svg',80,80,'레인 선택 '+direction,f'<path d="{path}" fill="#f5ca62"/>')
svg('ui/pause.svg',80,80,'일시정지','<path d="M26 20 V60 M54 20 V60" stroke-width="9"/>')
svg('ui/winner-crown.svg',128,96,'우승 왕관','<path d="M17 73 L8 24 L39 44 L64 9 L87 44 L119 24 L109 74Z" fill="#f5ca62"/><path d="M19 75 H107 V86 H19Z" fill="#f29b89"/><circle cx="64" cy="61" r="8" fill="#fff5dc"/>')

# Ending scenes from the kid's second planning note: drink "아~", then one of three reactions.
CREAM, CHEEK, LEMON, LEMON_IN = '#fdf3df', '#f4a79a', '#f5ca62', '#fff3a8'
def limb_ink(d): return f'<path d="{d}" fill="none" stroke-width="19"/>'
def limb_fill(d): return f'<path d="{d}" fill="none" stroke="{CREAM}" stroke-width="11"/>'
def lemon(cx, cy, r):
    spokes = ''.join(f'M{cx} {cy} L{cx + r * .74 * c:.1f} {cy + r * .74 * s:.1f} ' for c, s in [(1,0),(.5,.87),(-.5,.87),(-1,0),(-.5,-.87),(.5,-.87)])
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{LEMON}"/><circle cx="{cx}" cy="{cy}" r="{r * .74:.1f}" fill="{LEMON_IN}" stroke-width="2.5"/><path d="{spokes}" fill="none" stroke-width="2.5"/>'
def heart(cx, cy, s, fill='#f29b89'):
    return f'<path d="M{cx} {cy + s * .9:.1f} C{cx - s * 1.6:.1f} {cy - s * .2:.1f} {cx - s * .8:.1f} {cy - s * 1.3:.1f} {cx} {cy - s * .4:.1f} C{cx + s * .8:.1f} {cy - s * 1.3:.1f} {cx + s * 1.6:.1f} {cy - s * .2:.1f} {cx} {cy + s * .9:.1f}Z" fill="{fill}"/>'
def sparkle(cx, cy, r):
    return f'<path d="M{cx} {cy - r} Q{cx} {cy} {cx + r} {cy} Q{cx} {cy} {cx} {cy + r} Q{cx} {cy} {cx - r} {cy} Q{cx} {cy} {cx} {cy - r}Z" fill="{LEMON}" stroke-width="3"/>'
def friend(arms, face, extra='', cheeks=CHEEK, front=''):
    body = f'<path d="M94 138 C88 160 88 186 92 212 Q100 222 112 214 L113 204 Q120 202 127 204 L128 214 Q140 222 148 212 C152 186 152 160 146 138" fill="{CREAM}"/>'
    head = f'<circle cx="120" cy="92" r="58" fill="{CREAM}"/><ellipse cx="84" cy="110" rx="9" ry="5" fill="{cheeks}" stroke="none"/><ellipse cx="156" cy="110" rx="9" ry="5" fill="{cheeks}" stroke="none"/>'
    return extra + ''.join(map(limb_ink, arms)) + body + ''.join(map(limb_fill, arms)) + head + face + front
W_MOUTH = '<path d="M106 116 Q113 124 120 116 Q127 124 134 116" fill="none" stroke-width="3.5"/>'
svg('endings/drink.svg', 240, 240, '컵의 물을 마시는 친구', friend(
    ['M146 150 Q176 176 140 150'],
    '<path d="M82 88 Q92 96 102 88 M138 88 Q148 96 158 88" fill="none" stroke-width="3.5"/>',
    '<text x="170" y="40" font-size="30" font-weight="700" fill="#493c32" stroke="none" font-family="ui-rounded, sans-serif">아~</text>',
    front='<g transform="translate(100 104) rotate(-24)"><path d="M0 4 L5 46 Q21 51 37 46 L42 4" fill="#d6f2fa"/><path d="M4 22 Q21 27 38 22 L35 44 Q21 48 7 44Z" fill="#70cbe6" stroke="none"/><ellipse cx="21" cy="4" rx="21" ry="5" fill="#eaf8fc"/></g><circle cx="142" cy="140" r="11" fill="' + CREAM + '"/>'))
svg('endings/lemon.svg', 240, 240, '레몬에 반해 하트 눈이 된 친구', friend(
    ['M98 150 Q72 150 66 124', 'M142 150 Q168 150 174 124'],
    heart(92, 90, 11) + heart(148, 90, 11) + '<path d="M104 114 Q112 124 120 114 Q128 124 136 114" fill="none" stroke-width="3.5"/><path d="M131 119 Q136 132 131 138 Q126 132 129 121" fill="#bfe8f4" stroke-width="2.5"/>',
    lemon(26, 64, 18) + lemon(214, 150, 18) + lemon(34, 190, 14) + heart(206, 46, 16) + heart(186, 206, 9),
    front='<circle cx="64" cy="120" r="11" fill="' + CREAM + '"/><circle cx="176" cy="120" r="11" fill="' + CREAM + '"/>'))
svg('endings/dirty.svg', 240, 240, '똥물을 마시고 깜짝 놀란 친구', friend(
    ['M98 146 Q64 120 60 72', 'M142 146 Q176 120 180 72'],
    '<ellipse cx="94" cy="86" rx="11" ry="15" fill="white"/><ellipse cx="94" cy="88" rx="5" ry="8" fill="none" stroke-width="3"/><ellipse cx="146" cy="86" rx="11" ry="15" fill="white"/><ellipse cx="146" cy="88" rx="5" ry="8" fill="none" stroke-width="3"/>',
    '<path d="M92 20 L86 6 M120 16 V2 M148 20 L154 6" fill="none" stroke-width="3.5"/><path d="M186 94 Q180 106 186 110 Q192 106 186 94Z" fill="#bfe8f4" stroke-width="2.5"/>',
    cheeks='#c7dca9',
    front='<path d="M108 120 Q120 108 132 120 Q134 132 131 150 Q140 176 132 200 Q138 220 130 236 H112 Q104 216 110 198 Q102 172 110 150 Q106 132 108 120Z" fill="#b58a60"/><path d="M116 150 Q112 170 118 188 M125 200 Q121 214 124 226" fill="none" stroke="#ead6a4" stroke-width="3"/>'))
svg('endings/clean.svg', 240, 240, '엄지를 들고 활짝 웃는 친구', friend(
    ['M98 150 Q72 150 60 126', 'M142 152 Q160 166 150 178'],
    '<path d="M82 92 L93 81 L104 92 M136 92 L147 81 L158 92" fill="none" stroke-width="3.5"/>' + W_MOUTH,
    sparkle(200, 52, 14) + sparkle(36, 190, 10) + sparkle(210, 196, 8),
    front='<path d="M50 112 Q49 94 58 96 Q64 98 62 112" fill="' + CREAM + '" stroke-width="3.5"/><circle cx="57" cy="122" r="12" fill="' + CREAM + '"/><path d="M146 166 Q145 150 153 152 Q159 154 157 168" fill="' + CREAM + '" stroke-width="3.5"/><circle cx="152" cy="176" r="12" fill="' + CREAM + '"/>'))
svg('fx/lemon.svg', 64, 64, '비밀 레몬 조각', lemon(32, 32, 26))
manifest={'version':1,'pathsRelativeTo':'assets/','palette':{'paper':'#fff8e8','ink':INK,'clean':'#70cbe6','dirty':'#b58a60','sunny':'#f5ca62','coral':'#f29b89','sky':'#a3d9e8'},'assets':[{'id':'friend-idle','path':'characters/friend-idle.png','type':'png','width':1238,'height':1271,'transparent':True,'usage':'shared character for both players; cup is separate'},*entries]}
(A/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
