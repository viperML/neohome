import yaml
import fileinput

document = str()

print(":: Paste the yaml and click enter")

emptylines = 0

for line in fileinput.input(encoding="utf-8"):
    document += line + "\n"

    if not line.strip():
        emptylines += 1
    else:
        emptylines = 0

    if emptylines == 2:
        break

res = yaml.load(document, yaml.CLoader)

mappings = {
    "color_01": "--ts-black",
    "color_02": "--ts-red",
    "color_03": "--ts-green",
    "color_04": "--ts-yellow",
    "color_05": "--ts-blue",
    "color_06": "--ts-magenta",
    "color_07": "--ts-cyan",
    "color_08": "--ts-white",
    "color_09": "--ts-bright-black",
    "color_10": "--ts-bright-red",
    "color_11": "--ts-bright-green",
    "color_12": "--ts-bright-yellow",
    "color_13": "--ts-bright-blue",
    "color_14": "--ts-bright-magenta",
    "color_15": "--ts-bright-cyan",
    "color_16": "--ts-bright-white",
    "background": "--ts-background",
    "foreground": "--ts-foreground",
}


print(f"/* Gogh colorscheme: {res['name']} */")

for scheme_item, css_prop in mappings.items():
    print(f"{css_prop}: {res[scheme_item]};")


