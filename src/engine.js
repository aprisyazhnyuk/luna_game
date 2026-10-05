export const RULES = Object.freeze({width:390, ground:300, catX:94, gravity:1050, jumpSpeed:480, speed:132, chances:3});
export function createRun(random = Math.random) {
  return {phase:'ready', random, time:0, jumpTime:null, landTime:null, distance:0, treats:0, chances:RULES.chances, y:0, vy:0, buffer:0, invincible:0, spawnIn:2.8, obstacles:[], bites:[], particles:[], notice:'', noticeTime:0};
}
export function jump(run) {
  if (run.phase !== 'running') return;
  run.buffer = .14;
  if (run.y === 0 && run.vy === 0) { run.vy = RULES.jumpSpeed; run.buffer = 0; run.jumpTime=run.time; }
}
export function overlaps(a,b) {return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;}
export function step(run,dt) {
  if(run.phase !== 'running') return;
  dt = Math.min(Math.max(dt,0),1/30);
  run.time += dt; run.distance += RULES.speed*dt/22;
  run.invincible = Math.max(0,run.invincible-dt); run.noticeTime = Math.max(0,run.noticeTime-dt); run.buffer = Math.max(0,run.buffer-dt);
  const airborne = run.y>0 || run.vy>0;
  run.y = Math.max(0,run.y + run.vy*dt - RULES.gravity*dt*dt/2);
  run.vy -= RULES.gravity*dt;
  if(run.y === 0) {run.vy = 0; if(airborne)run.landTime=run.time; if(run.buffer > 0) jump(run);}
  run.spawnIn -= dt;
  if(run.spawnIn <= 0) {
    const box = run.random() > .5;
    run.obstacles.push({x:420,w:box?32:28,h:box?35:27,type:box?'box':'yarn'});
    // A short arch of bites above the obstacle rewards a well-timed hop.
    for(let i=0;i<3;i++) run.bites.push({x:402+i*24,y: RULES.ground-92-(i===1?38:0),taken:false});
    run.spawnIn=2.8+run.random()*1.3;
  }
  const cat={x:RULES.catX-22,y:RULES.ground-run.y-41,w:45,h:36};
  for(const obstacle of run.obstacles) {
    obstacle.x -= RULES.speed*dt;
    if(!obstacle.hit && run.invincible === 0 && overlaps(cat,{x:obstacle.x+4,y:RULES.ground-obstacle.h+4,w:obstacle.w-8,h:obstacle.h-4})) {
      obstacle.hit=true; run.chances--; run.invincible=2;
      run.notice='A little bump. Keep going, Luna.'; run.noticeTime=2;
      if(run.chances===0) {run.phase='over'; break;}
    }
  }
  for(const bite of run.bites) {
    bite.x -= RULES.speed*dt;
    if(!bite.taken && overlaps({x:cat.x-8,y:cat.y-8,w:cat.w+16,h:cat.h+16},{x:bite.x-5,y:bite.y-5,w:10,h:10})) {
      bite.taken=true;run.treats++;
      run.particles.push({x:bite.x,y:bite.y,life:.5});
    }
  }
  run.obstacles=run.obstacles.filter(o=>o.x+o.w>-30);
  run.bites=run.bites.filter(b=>b.x>-20&&!b.taken);
  for(const p of run.particles) {p.life-=dt;p.y-=22*dt;}
  run.particles=run.particles.filter(p=>p.life>0);
}
