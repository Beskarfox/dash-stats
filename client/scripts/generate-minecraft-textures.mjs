// Lists the item and block textures present in public/minecraft_assets, so the UI can pick the right icon
// without probing URLs that do not exist. Run it again after changing the resource pack:
//   node scripts/generate-minecraft-textures.mjs
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "public/minecraft_assets/minecraft_assets/assets/minecraft/textures";
const names = (dir) =>
  readdirSync(join(root, dir))
    .filter((file) => file.endsWith(".png"))
    .map((file) => file.slice(0, -4))
    .sort();

const manifest = { item: names("item"), block: names("block") };
writeFileSync("src/lib/minecraftTextures.json", JSON.stringify(manifest) + "\n");
console.log(`item: ${manifest.item.length}, block: ${manifest.block.length}`);
