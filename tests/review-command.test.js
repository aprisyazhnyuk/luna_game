import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {sandbox,hashes,project} from './helpers/review-sandbox.js';
const command=join(project,'scripts/apply-wardrobe-review.mjs');
function run(args){return spawnSync(process.execPath,[command,...args],{encoding:'utf8'});}
test('CLI defaults to read-only planning, applies explicitly and is idempotent',async t=>{
 const s=await sandbox(t),args=['--root',s.root,'--review',s.review,'--preview',s.preview],before=await hashes(s.root);
 const preview=run(args);assert.equal(preview.status,0,preview.stderr);assert.equal(JSON.parse(preview.stdout).mode,'dry-run');assert.deepEqual(await hashes(s.root),before);
 const applied=run([...args,'--apply']);assert.equal(applied.status,0,applied.stderr);assert.equal(JSON.parse(applied.stdout).mode,'applied');const after=await hashes(s.root);assert.notDeepEqual(after,before);
 const repeated=run([...args,'--apply']);assert.equal(repeated.status,0,repeated.stderr);assert.equal(JSON.parse(repeated.stdout).files.length,0);assert.deepEqual(await hashes(s.root),after);
});
test('CLI rejects missing/duplicate/unknown options with nonzero status and no writes',async t=>{
 const s=await sandbox(t),before=await hashes(s.root);
 for(const args of [[],['--apply'],['--root',s.root,'--unknown'],['--root',s.root,'--root',s.root],['--apply','--dry-run'],['--recover','--review',s.review]])assert.notEqual(run(args).status,0);
 assert.deepEqual(await hashes(s.root),before);assert.equal(run(['--help']).status,0);
});
