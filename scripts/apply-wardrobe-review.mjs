#!/usr/bin/env node
import {fileURLToPath} from 'node:url';
import {prepareReview,applyPrepared,recoverReview} from './lib/review-application.mjs';
const help=`Luna wardrobe review application (Node 22+)

node scripts/apply-wardrobe-review.mjs --review FIT.json --preview PREVIEW.png [--root DIR] [--dry-run | --apply]
node scripts/apply-wardrobe-review.mjs --root DIR --recover

Default: dry-run JSON report, no writes. --apply transfers exact validated images
and every supplied fit, archives the pair/report and updates the offline worker.
Run --recover only after an interrupted writer has stopped. Apply approved pairs
with other checkout writers/servers stopped; inspect the resulting Git diff.
`;
try{
 const args=process.argv.slice(2),options={},flags=new Set(['--apply','--dry-run','--recover','--help']),values=new Set(['--root','--review','--preview']);
 for(let i=0;i<args.length;i++){
  const arg=args[i];if(Object.hasOwn(options,arg))throw new Error(`Duplicate option ${arg}`);
  if(flags.has(arg))options[arg]=true;
  else if(values.has(arg)){if(!args[i+1]||args[i+1].startsWith('--'))throw new Error(`Missing value for ${arg}`);options[arg]=args[++i];}
  else throw new Error(`Unknown option ${arg}`);
 }
 if(options['--help']){if(args.length!==1)throw new Error('--help cannot be combined with other options');process.stdout.write(help);}
 else{
  const root=options['--root']??fileURLToPath(new URL('../',import.meta.url));
  if(options['--recover']){
   if(options['--review']||options['--preview']||options['--apply']||options['--dry-run'])throw new Error('--recover cannot be combined with review/application options');
   process.stdout.write(JSON.stringify({mode:'recovery',...await recoverReview(root)},null,2)+'\n');
  }else{
   if(!options['--review']||!options['--preview'])throw new Error('Both --review and --preview are required');
   if(options['--apply']&&options['--dry-run'])throw new Error('Choose --apply or --dry-run');
   const plan=await prepareReview({root,review:options['--review'],preview:options['--preview']});
   const report=options['--apply']?await applyPrepared(plan):plan.report;
   process.stdout.write(JSON.stringify({mode:options['--apply']?'applied':'dry-run',...report},null,2)+'\n');
  }
 }
}catch(error){process.stderr.write(`Wardrobe review failed: ${error.message}\n`);process.exitCode=1;}
