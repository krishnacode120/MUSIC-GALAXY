export const particleVertex = /* glsl */ `
attribute float aPhase;attribute float aLane;attribute float aBand;attribute float aSize;
uniform float uTime,uMode,uBass,uMid,uTreble,uEnergy,uHit,uTravel,uRatio,uSpread,uBrightness;
uniform float uSpectrum[64],uWaveform[64];
uniform vec3 uLowColor,uBodyColor,uDetailColor,uLayers;
varying vec3 vColor;varying float vAlpha,vStreak,vAngle,vMatrix,vGlyph;
const float PI=3.14159265359;
float spectrum(float x){return uSpectrum[int(clamp(x,0.,63.))];}
void main(){
 float angle=aLane*PI*2., r=pow(aPhase,.6)*12.;
 float band=aBand<.5?uBass:aBand<1.5?uMid:uTreble;
 float layer=aBand<.5?uLayers.x:aBand<1.5?uLayers.y:uLayers.z;
 float bin=12.+aPhase*51.;float freq=spectrum(bin);
 vec3 p=position;vStreak=0.;vMatrix=0.;float depthFade=1.;
 if(uMode<.5){
   float z=mod(aPhase*90.+uTravel*2.,90.)-72.;
   float a=angle+z*.014+sin(z*.08+uTime*.18)*(.12+uMid*.25);
   float radius=(.8+abs(position.x)*5.2+aBand*1.5)*(1.+uBass*.26+uHit*.08);
   p=vec3(cos(a)*radius,sin(a)*radius,z);vStreak=clamp(.12+uEnergy*.25,0.,.5);
   depthFade=smoothstep(-72.,-55.,z)*(1.-smoothstep(5.,15.,z));
 }else if(uMode<1.5){
   float x=(aPhase-.5)*33.,lane=floor(aLane*46.);
   float wave=uWaveform[int(aPhase*63.)];float spacing=(lane-22.5)*.21;
   float y=sin(x*.38+uTime*1.1+lane*.13)*(.18+uMid*.65)+wave*4.5+spacing;
   p=vec3(x,y+sin(aPhase*PI)*(freq*2.8+uBass*.8),-lane*.15+3.);
 }else if(uMode<2.5){
   float curl=angle+r*.22+uTime*.12+sin(r*.6-uTime*.35)*(.25+uMid*.65);
   r*=1.+uBass*.26+uHit*.06;float ribbon=sin(curl*3.+r*.3+uTime*.2);
   p=vec3(cos(curl)*r,sin(curl)*r*.62,position.z*.55+ribbon*(1.4+uMid*2.));
   p.xy+=vec2(sin(p.y*.35+uTime*.5),cos(p.x*.28-uTime*.4))*(.45+freq*1.6);
 }else if(uMode<3.5){p=vec3(0.);}
 else if(uMode<4.5){
   float x=(aPhase-.5)*48.,z=(aLane-.5)*60.-8.;
   float y=sin(x*.22+uTime)*cos(z*.18+uTime*.55)*(.28+uBass*2.8)+sin(z*.55-uTime*1.3)*(.12+uMid)+freq*2.;
   p=vec3(x,y,z);
 }else if(uMode<5.5){p=vec3(0.);}
 else if(uMode<6.5){
   float arm=floor(aLane*3.),jitter=fract(aLane*3.)-.5;
   float a=arm*PI*2./3.+r*.49-uTime*.28+jitter*.45;
   float breath=1.+uBass*.3+sin(a*3.+uTime)*uMid*.12;
   p=vec3(cos(a)*r*breath,sin(a)*r*.64*breath,position.z*.65+sin(a*2.+r*.8-uTime)*freq*2.);
 }else if(uMode<7.5){p=vec3(0.);}
 else if(uMode<8.5){
   float y=aPhase*2.-1.,latitudeRadius=sqrt(max(0.,1.-y*y));float a=angle+uTime*.16;
   float radius=7.2+freq*1.8+uBass*.85+sin(angle*12.+uTime*2.)*uTreble*.35;
   p=vec3(cos(a)*latitudeRadius,y,sin(a)*latitudeRadius)*radius;
 }else{
   float column=floor(aPhase*56.),fall=mod(aLane*30.-uTravel*(.8+fract(column*.618)*1.5)+30.,30.);
   p=vec3((column-27.5)*.53,fall-15.,floor(fract(aPhase*56.)*5.)*1.6-4.);
   vMatrix=1.;vGlyph=mod(floor(aLane*997.)+floor(uTime*(1.+uTreble*5.))+column*7.,64.);
 }
 p*=uSpread;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 vec3 color=mix(uLowColor,uBodyColor,clamp(aPhase*.7+uMid*.25,0.,1.));
 color=mix(color,uDetailColor,clamp(freq*.55+uTreble*.2,0.,.7));
 if(uMode>5.5&&uMode<6.5) color=mix(vec3(.12,.08,.22),mix(uBodyColor,uDetailColor,aPhase),pow(aPhase,.6));
 if(uMode>8.5)color=mix(vec3(.025,.5,.22),vec3(.65,1.,.78),pow(fract(aLane*13.),9.)+uTreble*.3);
 vColor=color*(.5+band*.55+freq*.5+uHit*.15)*uBrightness;vAlpha=layer*(.36+band*.14+freq*.1)*depthFade;
 if(uMode>8.5)vAlpha*=.4+pow(fract(aLane*13.),2.)*.6;
 if((uMode>2.5&&uMode<3.5)||(uMode>4.5&&uMode<5.5)||(uMode>6.5&&uMode<7.5))vAlpha=0.;
 vAngle=atan(mv.y,mv.x);
 float size=aSize*uRatio*250./max(2.,-mv.z)*(1.+band*.22+uTreble*.1+uHit*.1);
 if(uMode>8.5)size=uRatio*440./max(4.,-mv.z);
 gl_PointSize=clamp(size,1.05,uMode>8.5?32.:20.);
}`;
export const particleFragment = /* glsl */ `
uniform sampler2D uGlyphs;varying vec3 vColor;varying float vAlpha,vStreak,vAngle,vMatrix,vGlyph;
void main(){
 if(vAlpha<.001)discard;
 if(vMatrix>.5){vec2 tile=vec2(mod(vGlyph,8.),floor(vGlyph/8.));
   vec2 uv=(tile+vec2(gl_PointCoord.x,1.-gl_PointCoord.y))/8.;
   float glyph=texture2D(uGlyphs,uv).a;if(glyph<.02)discard;
   gl_FragColor=vec4(vColor,glyph*vAlpha);return;}
 vec2 p=gl_PointCoord-.5;float c=cos(vAngle),s=sin(vAngle);p=mat2(c,-s,s,c)*p;p.y*=1.+vStreak*3.;
 float d=dot(p,p);if(d>.25)discard;float glow=exp(-d*20.);
 gl_FragColor=vec4(vColor+vec3(exp(-d*80.)*.22),glow*vAlpha);
}`;
export const cloudVertex = /* glsl */ `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const cloudFragment = /* glsl */ `
varying vec2 vUv;uniform float uTime,uMid,uEnergy,uBrightness;uniform vec3 uTint,uTint2;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=noise(p)*a;p=p*2.03+13.7;a*=.5;}return n;}
void main(){vec2 p=(vUv-.5)*2.,q=p*3.;float n=fbm(q+vec2(fbm(q+uTime*.07),fbm(q-uTime*.055))*(1.+uMid*.7));
float dust=fbm(q*3.+n*3.);float alpha=pow(dust,1.6)*(1.-smoothstep(.1,1.,length(p)));
vec3 color=mix(uTint,uTint2,n);color=mix(color,vec3(.04,.45,.38),smoothstep(.6,1.5,p.x+n)*.65);
gl_FragColor=vec4(color*(.4+uEnergy*.2)*uBrightness,alpha*.4);}`;

export const starsVertex = /* glsl */ `
attribute float aSize;uniform float uTime,uTreble,uRatio,uBrightness;varying float vAlpha;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
gl_PointSize=clamp(aSize*uRatio*120./max(1.,-mv.z)*(1.+uTreble*.9),.6,5.);
vAlpha=(.25+sin(position.x*3.+uTime*.2)*.06+uTreble*.15)*uBrightness;}`;
export const starsFragment = /* glsl */ `varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(.69,.81,1.,exp(-r*r*5.)*vAlpha);}`;
