import { chromium } from "playwright";
const S="/private/tmp/claude-501/-Users-tranducviet-Documents-DVG-WEB/d7e4d8d3-4b31-4315-9fe7-c92d90618232/scratchpad/shots/";
const b = await chromium.launch({channel:"chrome",args:["--use-gl=swiftshader","--enable-webgl","--ignore-gpu-blocklist"]});
for (const [n,w,h] of [["m",390,844],["d",1440,900]]){
const p = await (await b.newContext({viewport:{width:w,height:h}})).newPage();
await p.goto("http://127.0.0.1:3200/ban-do?du-an=sun-ponte-residence&toa=T1&tang=15&can=12");await p.waitForTimeout(10000);
if(n==="m"){await p.locator(".fp3d-info").scrollIntoViewIfNeeded();await p.locator(".fp3d-media").scrollIntoViewIfNeeded();}
await p.waitForTimeout(800);
await p.screenshot({path:S+"card-"+n+".jpg",type:"jpeg",quality:75});
await p.getByRole("button",{name:"Vào bên trong căn 3D"}).click();await p.waitForTimeout(9000);
await p.screenshot({path:S+"arrows-"+n+".jpg",type:"jpeg",quality:75});
const vis=await p.locator(".in3d-spot:not([hidden])").allInnerTexts();console.log(n,"arrows",vis.join(" | "));
if(vis.length){await p.locator(".in3d-spot:not([hidden])").first().click();await p.waitForTimeout(3000);await p.screenshot({path:S+"arrows2-"+n+".jpg",type:"jpeg",quality:75});}
await p.close();}
await b.close();
