import cairosvg
from PIL import Image
import os

svg = "desktop/Logo.svg"
png = "desktop/Logo.png"
ico = "desktop/Logo.ico"

# SVG → PNG (256x256)
cairosvg.svg2png(url=svg, write_to=png, output_width=256, output_height=256)

# PNG → ICO (multi-tailles)
img = Image.open(png)
img.save(ico, sizes=[(16,16), (24,24), (32,32), (48,48), (64,64), (128,128), (256,256)])

os.unlink(png)  # optionnel : supprimer le PNG temporaire   