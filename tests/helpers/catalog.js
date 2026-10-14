// Node-only setup: no browser IO or network side effects on module import.
import {readFile} from 'node:fs/promises';
import {configureWardrobe} from '../../src/customisation.js';
export async function initializeCatalog(){
 configureWardrobe(JSON.parse(await readFile(new URL('../../assets/cosmetics/catalog.json',import.meta.url))));
}
