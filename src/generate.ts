#!/usr/bin/env -S node --enable-source-maps

import {program, Option} from "commander";
import path from "node:path";
import {Universe} from "./universe.js";
import {World} from "./universe/world.js";
import * as YAML from 'yaml';
import logger from "./logger.js";
import fs from "node:fs";
import {OverrideWorld} from "./universe/override.js";


program
    .option('--sector <string>', 'sector directory', path.join(process.cwd(), 'static', 'res', 'Sectors'))
    .option('--override <string>', 'override directory', path.join(process.cwd(), 'static', 'res', 'overrides'))
    .option('--milieu <string>', 'override directory')
    .option('--byWorld,-w', 'multiple output files by world-name', false)
    .addOption(new Option('--output <filename>', 'output file').makeOptionMandatory(true))
    .option('--log <string>', 'log level', 'error')
    .arguments('<sector>')
;
program.parse();
const opts = program.opts();


logger.level = opts['log'];
Universe.baseDir = opts['sector'];
Universe.OVERRIDE_DIR = opts['override'];

if(opts['byWorld']) {
    const stat = await fs.promises.stat(opts['output']);
    if(!stat.isDirectory()) {
        throw new Error(`${opts['output']} must be a directory if byWorld option is set`);
    }
}

const universe = await Universe.getUniverse(opts['milieu']);
const sector = universe.getSectorByName(program.args[0]);
const result = sector?.enrichWorlds();


if(opts['byWorld']) {
    const grouped = result?.reduce((pv, cv) => {
        const coords = World.hexToCoords(cv.hex?.toString() ?? '');
        const worldName = World.coordsToHex(<[number,number]>coords.slice(0,2));
        pv[worldName] ??= [];
        pv[worldName].push(cv);
        return pv;
    }, {} as Record<string,OverrideWorld[]>) ?? {}

    for(const group of Object.keys(grouped)) {
        fs.writeFileSync(`${opts['output']}/${group}.yml`, YAML.stringify(grouped[group]));
    }
} else {
    const mapped = {
        sector: program.args[0],
        world: result,
    };
    fs.writeFileSync(opts['output'], YAML.stringify(mapped));
}
