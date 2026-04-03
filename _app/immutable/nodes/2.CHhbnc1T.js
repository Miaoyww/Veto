import"../chunks/DsnmJJEf.js";import{o as Ko,q as Jo,R as Zo,E as ts,br as es,bs as rs,ab as os,h as He,bt as ss,bu as as,bv as ns,bc as Ao,ar as is,ac as ls,a4 as J,k as e,ay as T,ag as m,az as $,g as Ft,bj as Pe,p as M,a0 as E,a as P,b as d,c as z,f as y,d as v,r as c,u as cs,al as We,t as B,s as h,aB as Qt,aA as Ve,aR as Mt,l as po,bw as gr,an as yr,bl as ds}from"../chunks/r3kq2iZU.js";import{t as vs,a as H,p as Ze,w as vr,s as O,r as _o,d as Co,o as us}from"../chunks/BLY_Nqnf.js";import{a as Ot,d as Eo,s as tr,e as Ke,r as we,f as zt,b as wr}from"../chunks/CtsjAV9X.js";import{p as A,i as K,r as F,s as st,c as ge,a as $t,b as je}from"../chunks/DMNfheuf.js";import{c as Yt,B as Gt,s as hs,d as Lo,V as bo}from"../chunks/D2rtO7OT.js";import{c as ae}from"../chunks/Dxu5u2ZC.js";import{a as de,Q as fs,c as ur,d as ke,b as ot,m as Ht,C as Xe,z as mo,G as ps,w as Mo,D as _s,q as bs,t as ms,U as gs,P as hr,x as zo,S as ys,E as xs,V as $s,v as ws,J as go,R as Ss,n as Ps}from"../chunks/CJyjPq2w.js";import{i as ks,z as Ts,c as Ns,B as Oo,U as As,I as Sr,a as Pr,A as kr,b as Tr,M as Nr,d as Ar,S as Cr,N as Er,e as Lr,f as Mr,g as zr,h as Or,F as Rr,j as Br,k as Vr,l as Dr,m as Ir,n as Ur}from"../chunks/Bo8Uh9px.js";import{I as Kt,q as Ro,f as qr,m as Bo,t as Xr,v as Cs,s as Es,e as G,j as pt,T as Vo,w as Ls,k as Do,x as yo,y as Ms,g as zs,i as Os,z as Rs,A as Te,B as Bs}from"../chunks/CjHuvye1.js";import"../chunks/CYZA8CCV.js";import{i as er}from"../chunks/DKnzj5ex.js";import{a as Vs,c as Ds,b as ce,P as Io,S as Is}from"../chunks/55miudaC.js";import{v as Us}from"../chunks/BwG5mLSZ.js";import{L as Fs}from"../chunks/DiaY1P27.js";function Ys(s,t,r,o,a){Ko&&Jo();var i=t.$$slots?.[r],n=!1;i===!0&&(i=t.children,n=!0),i===void 0||i(s,n?()=>o:o)}const Hs=()=>performance.now(),Se={tick:s=>requestAnimationFrame(s),now:()=>Hs(),tasks:new Set};function Uo(){const s=Se.now();Se.tasks.forEach(t=>{t.c(s)||(Se.tasks.delete(t),t.f())}),Se.tasks.size!==0&&Se.tick(Uo)}function Fo(s){let t;return Se.tasks.size===0&&Se.tick(Uo),{promise:new Promise(r=>{Se.tasks.add(t={c:s,f:r})}),abort(){Se.tasks.delete(t)}}}function nr(s,t){Ao(()=>{s.dispatchEvent(new CustomEvent(t))})}function js(s){if(s==="float")return"cssFloat";if(s==="offset")return"cssOffset";if(s.startsWith("--"))return s;const t=s.split("-");return t.length===1?t[0]:t[0]+t.slice(1).map(r=>r[0].toUpperCase()+r.slice(1)).join("")}function xo(s){const t={},r=s.split(";");for(const o of r){const[a,i]=o.split(":");if(!a||i===void 0)break;const n=js(a.trim());t[n]=i.trim()}return t}const Ws=s=>s;function Ge(s,t,r,o){var a=(s&as)!==0,i=(s&ns)!==0,n=a&&i,l=(s&ss)!==0,u=n?"both":a?"in":"out",f,_=t.inert,b=t.style.overflow,p,g;function x(){return Ao(()=>f??=r()(t,o?.()??{},{direction:u}))}var S={is_global:l,in(){if(t.inert=_,!a){g?.abort(),g?.reset?.();return}i||p?.abort(),nr(t,"introstart"),p=Fr(t,x(),g,1,()=>{nr(t,"introend"),p?.abort(),p=f=void 0,t.style.overflow=b})},out(C){if(!i){C?.(),f=void 0;return}t.inert=!0,nr(t,"outrostart"),g=Fr(t,x(),p,0,()=>{nr(t,"outroend"),C?.()})},stop:()=>{p?.abort(),g?.abort()}},N=Zo;if((N.transitions??=[]).push(S),a&&vs){var R=l;if(!R){for(var D=N.parent;D&&(D.f&ts)!==0;)for(;(D=D.parent)&&(D.f&es)===0;);R=!D||(D.f&rs)!==0}R&&os(()=>{He(()=>S.in())})}}function Fr(s,t,r,o,a){var i=o===1;if(is(t)){var n,l=!1;return ls(()=>{if(!l){var N=t({direction:i?"in":"out"});n=Fr(s,N,r,o,a)}}),{abort:()=>{l=!0,n?.abort()},deactivate:()=>n.deactivate(),reset:()=>n.reset(),t:()=>n.t()}}if(r?.deactivate(),!t?.duration)return a(),{abort:J,deactivate:J,reset:J,t:()=>o};const{delay:u=0,css:f,tick:_,easing:b=Ws}=t;var p=[];if(i&&r===void 0&&(_&&_(0,1),f)){var g=xo(f(0,1));p.push(g,g)}var x=()=>1-o,S=s.animate(p,{duration:u,fill:"forwards"});return S.onfinish=()=>{S.cancel();var N=r?.t()??1-o;r?.abort();var R=o-N,D=t.duration*Math.abs(R),C=[];if(D>0){var X=!1;if(f)for(var Q=Math.ceil(D/16.666666666666668),nt=0;nt<=Q;nt+=1){var Tt=N+R*b(nt/Q),wt=xo(f(Tt,1-Tt));C.push(wt),X||=wt.overflow==="hidden"}X&&(s.style.overflow="hidden"),x=()=>{var bt=S.currentTime;return N+R*b(bt/D)},_&&Fo(()=>{if(S.playState!=="running")return!1;var bt=x();return _(bt,1-bt),!0})}S=s.animate(C,{duration:D,fill:"forwards"}),S.onfinish=()=>{x=()=>o,_?.(o,1-o),a()}},{abort:()=>{S&&(S.cancel(),S.effect=null,S.onfinish=J)},deactivate:()=>{a=J},reset:()=>{o===0&&_?.(1,0)},t:()=>x()}}function qs(s,t){if(ks(s)){const o=s();return o===void 0?t:o}return s===void 0?t:s}function fr(s,t){let r=T(null);const o=$(()=>qs(t,250));function a(...i){if(e(r))e(r).timeout&&clearTimeout(e(r).timeout);else{let n,l;const u=new Promise((f,_)=>{n=f,l=_});m(r,{timeout:null,runner:null,promise:u,resolve:n,reject:l},!0)}return e(r).runner=async()=>{if(!e(r))return;const n=e(r);m(r,null);try{n.resolve(await s.apply(this,i))}catch(l){n.reject(l)}},e(r).timeout=setTimeout(e(r).runner,e(o)),e(r).promise}return a.cancel=async()=>{(!e(r)||e(r).timeout===null)&&(await new Promise(i=>setTimeout(i,0)),!e(r)||e(r).timeout===null)||(clearTimeout(e(r).timeout),e(r).reject("Cancelled"),m(r,null))},a.runScheduledNow=async()=>{(!e(r)||!e(r).timeout)&&(await new Promise(i=>setTimeout(i,0)),!e(r)||!e(r).timeout)||(clearTimeout(e(r).timeout),e(r).timeout=null,await e(r).runner?.())},Object.defineProperty(a,"pending",{enumerable:!0,get(){return!!e(r)?.timeout}}),a}class Qr{#t=T(!1);constructor(){Ft(()=>(He(()=>m(this.#t,!0)),()=>{m(this.#t,!1)}))}get current(){return e(this.#t)}}const Xs=ur({component:"separator",parts:["root"]});class Gr{static create(t){return new Gr(t)}opts;attachment;constructor(t){this.opts=t,this.attachment=de(t.ref)}#t=$(()=>({id:this.opts.id.current,role:this.opts.decorative.current?"none":"separator","aria-orientation":this.opts.orientation.current,"aria-hidden":fs(this.opts.decorative.current),"data-orientation":this.opts.orientation.current,[Xs.root]:"",...this.attachment}));get props(){return e(this.#t)}set props(t){m(this.#t,t)}}var Qs=y("<div><!></div>");function Gs(s,t){const r=Pe();M(t,!0);let o=A(t,"id",19,()=>ke(r)),a=A(t,"ref",15,null),i=A(t,"decorative",3,!1),n=A(t,"orientation",3,"horizontal"),l=F(t,["$$slots","$$events","$$legacy","id","ref","child","children","decorative","orientation"]);const u=Gr.create({ref:ot(()=>a(),x=>a(x)),id:ot(()=>o()),decorative:ot(()=>i()),orientation:ot(()=>n())}),f=$(()=>Ht(l,u.props));var _=E(),b=P(_);{var p=x=>{var S=E(),N=P(S);H(N,()=>t.child,()=>({props:e(f)})),d(x,S)},g=x=>{var S=Qs();Ot(S,()=>({...e(f)}));var N=v(S);H(N,()=>t.children??J),c(S),d(x,S)};K(b,x=>{t.child?x(p):x(g,!1)})}d(s,_),z()}const Ks=ur({component:"label",parts:["root"]});class Kr{static create(t){return new Kr(t)}opts;attachment;constructor(t){this.opts=t,this.attachment=de(this.opts.ref),this.onmousedown=this.onmousedown.bind(this)}onmousedown(t){t.detail>1&&t.preventDefault()}#t=$(()=>({id:this.opts.id.current,[Ks.root]:"",onmousedown:this.onmousedown,...this.attachment}));get props(){return e(this.#t)}set props(t){m(this.#t,t)}}var Js=y("<label><!></label>");function Zs(s,t){const r=Pe();M(t,!0);let o=A(t,"id",19,()=>ke(r)),a=A(t,"ref",15,null),i=F(t,["$$slots","$$events","$$legacy","children","child","id","ref","for"]);const n=Kr.create({id:ot(()=>o()),ref:ot(()=>a(),p=>a(p))}),l=$(()=>Ht(i,n.props,{for:t.for}));var u=E(),f=P(u);{var _=p=>{var g=E(),x=P(g);H(x,()=>t.child,()=>({props:e(l)})),d(p,g)},b=p=>{var g=Js();Ot(g,()=>({...e(l),for:t.for}));var x=v(g);H(x,()=>t.children??J),c(g),d(p,g)};K(f,p=>{t.child?p(_):p(b,!1)})}d(s,u),z()}class qe{#t;#e;constructor(t,r){this.#t=t,this.#e=r,this.handler=this.handler.bind(this),Ft(this.handler)}handler(){let t=0;const r=this.#t();if(!r)return;const o=new ResizeObserver(()=>{cancelAnimationFrame(t),t=window.requestAnimationFrame(this.#e)});return o.observe(r),()=>{window.cancelAnimationFrame(t),o.unobserve(r)}}}function ta(s,t,r){return Math.min(r,Math.max(t,s))}const rr=ur({component:"scroll-area",parts:["root","viewport","corner","thumb","scrollbar"]}),or=new Xe("ScrollArea.Root"),sr=new Xe("ScrollArea.Scrollbar"),pr=new Xe("ScrollArea.ScrollbarVisible"),Jr=new Xe("ScrollArea.ScrollbarAxis"),Yo=new Xe("ScrollArea.ScrollbarShared");class Zr{static create(t){return or.set(new Zr(t))}opts;attachment;#t=T(null);get scrollAreaNode(){return e(this.#t)}set scrollAreaNode(t){m(this.#t,t,!0)}#e=T(null);get viewportNode(){return e(this.#e)}set viewportNode(t){m(this.#e,t,!0)}#r=T(null);get contentNode(){return e(this.#r)}set contentNode(t){m(this.#r,t,!0)}#o=T(null);get scrollbarXNode(){return e(this.#o)}set scrollbarXNode(t){m(this.#o,t,!0)}#s=T(null);get scrollbarYNode(){return e(this.#s)}set scrollbarYNode(t){m(this.#s,t,!0)}#a=T(0);get cornerWidth(){return e(this.#a)}set cornerWidth(t){m(this.#a,t,!0)}#n=T(0);get cornerHeight(){return e(this.#n)}set cornerHeight(t){m(this.#n,t,!0)}#i=T(!1);get scrollbarXEnabled(){return e(this.#i)}set scrollbarXEnabled(t){m(this.#i,t,!0)}#l=T(!1);get scrollbarYEnabled(){return e(this.#l)}set scrollbarYEnabled(t){m(this.#l,t,!0)}domContext;constructor(t){this.opts=t,this.attachment=de(t.ref,r=>this.scrollAreaNode=r),this.domContext=new _s(t.ref)}#c=$(()=>({id:this.opts.id.current,dir:this.opts.dir.current,style:{position:"relative","--bits-scroll-area-corner-height":`${this.cornerHeight}px`,"--bits-scroll-area-corner-width":`${this.cornerWidth}px`},[rr.root]:"",...this.attachment}));get props(){return e(this.#c)}set props(t){m(this.#c,t)}}class to{static create(t){return new to(t,or.get())}opts;root;attachment;#t=mo(ps());#e=mo(null);contentAttachment=de(this.#e,t=>this.root.contentNode=t);constructor(t,r){this.opts=t,this.root=r,this.attachment=de(t.ref,o=>this.root.viewportNode=o)}#r=$(()=>({id:this.opts.id.current,style:{overflowX:this.root.scrollbarXEnabled?"scroll":"hidden",overflowY:this.root.scrollbarYEnabled?"scroll":"hidden"},[rr.viewport]:"",...this.attachment}));get props(){return e(this.#r)}set props(t){m(this.#r,t)}#o=$(()=>({id:this.#t.current,"data-scroll-area-content":"",style:{minWidth:this.root.scrollbarXEnabled?"fit-content":void 0},...this.contentAttachment}));get contentProps(){return e(this.#o)}set contentProps(t){m(this.#o,t)}}class eo{static create(t){return sr.set(new eo(t,or.get()))}opts;root;#t=$(()=>this.opts.orientation.current==="horizontal");get isHorizontal(){return e(this.#t)}set isHorizontal(t){m(this.#t,t)}#e=T(!1);get hasThumb(){return e(this.#e)}set hasThumb(t){m(this.#e,t,!0)}constructor(t,r){this.opts=t,this.root=r,Mo(()=>this.isHorizontal,o=>o?(this.root.scrollbarXEnabled=!0,()=>{this.root.scrollbarXEnabled=!1}):(this.root.scrollbarYEnabled=!0,()=>{this.root.scrollbarYEnabled=!1}))}}class ro{static create(){return new ro(sr.get())}scrollbar;root;#t=T(!1);get isVisible(){return e(this.#t)}set isVisible(t){m(this.#t,t,!0)}constructor(t){this.scrollbar=t,this.root=t.root,Ft(()=>{const r=this.root.scrollAreaNode,o=this.root.opts.scrollHideDelay.current;let a=0;if(!r)return;const i=()=>{this.root.domContext.clearTimeout(a),He(()=>this.isVisible=!0)},n=()=>{a&&this.root.domContext.clearTimeout(a),a=this.root.domContext.setTimeout(()=>{He(()=>{this.scrollbar.hasThumb=!1,this.isVisible=!1})},o)},l=bs(Ze(r,"pointerenter",i),Ze(r,"pointerleave",n));return()=>{this.root.domContext.getWindow().clearTimeout(a),l()}})}#e=$(()=>({"data-state":this.isVisible?"visible":"hidden"}));get props(){return e(this.#e)}set props(t){m(this.#e,t)}}class oo{static create(){return new oo(sr.get())}scrollbar;root;machine=new gs("hidden",{hidden:{SCROLL:"scrolling"},scrolling:{SCROLL_END:"idle",POINTER_ENTER:"interacting"},interacting:{SCROLL:"interacting",POINTER_LEAVE:"idle"},idle:{HIDE:"hidden",SCROLL:"scrolling",POINTER_ENTER:"interacting"}});#t=$(()=>this.machine.state.current==="hidden");get isHidden(){return e(this.#t)}set isHidden(t){m(this.#t,t)}constructor(t){this.scrollbar=t,this.root=t.root;const r=fr(()=>this.machine.dispatch("SCROLL_END"),100);Ft(()=>{const o=this.machine.state.current,a=this.root.opts.scrollHideDelay.current;if(o==="idle"){const i=this.root.domContext.setTimeout(()=>this.machine.dispatch("HIDE"),a);return()=>this.root.domContext.clearTimeout(i)}}),Ft(()=>{const o=this.root.viewportNode;if(!o)return;const a=this.scrollbar.isHorizontal?"scrollLeft":"scrollTop";let i=o[a];return Ze(o,"scroll",()=>{const u=o[a];i!==u&&(this.machine.dispatch("SCROLL"),r()),i=u})}),this.onpointerenter=this.onpointerenter.bind(this),this.onpointerleave=this.onpointerleave.bind(this)}onpointerenter(t){this.machine.dispatch("POINTER_ENTER")}onpointerleave(t){this.machine.dispatch("POINTER_LEAVE")}#e=$(()=>({"data-state":this.machine.state.current==="hidden"?"hidden":"visible",onpointerenter:this.onpointerenter,onpointerleave:this.onpointerleave}));get props(){return e(this.#e)}set props(t){m(this.#e,t)}}class _r{static create(){return new _r(sr.get())}scrollbar;root;#t=T(!1);get isVisible(){return e(this.#t)}set isVisible(t){m(this.#t,t,!0)}constructor(t){this.scrollbar=t,this.root=t.root;const r=fr(()=>{const o=this.root.viewportNode;if(!o)return;const a=o.offsetWidth<o.scrollWidth,i=o.offsetHeight<o.scrollHeight;this.isVisible=this.scrollbar.isHorizontal?a:i},10);new qe(()=>this.root.viewportNode,r),new qe(()=>this.root.contentNode,r)}#e=$(()=>({"data-state":this.isVisible?"visible":"hidden"}));get props(){return e(this.#e)}set props(t){m(this.#e,t)}}class so{static create(){return pr.set(new so(sr.get()))}scrollbar;root;#t=T(null);get thumbNode(){return e(this.#t)}set thumbNode(t){m(this.#t,t,!0)}#e=T(0);get pointerOffset(){return e(this.#e)}set pointerOffset(t){m(this.#e,t,!0)}#r=T({content:0,viewport:0,scrollbar:{size:0,paddingStart:0,paddingEnd:0}});get sizes(){return e(this.#r)}set sizes(t){m(this.#r,t)}#o=$(()=>Ho(this.sizes.viewport,this.sizes.content));get thumbRatio(){return e(this.#o)}set thumbRatio(t){m(this.#o,t)}#s=$(()=>this.thumbRatio>0&&this.thumbRatio<1);get hasThumb(){return e(this.#s)}set hasThumb(t){m(this.#s,t)}#a=T("");get prevTransformStyle(){return e(this.#a)}set prevTransformStyle(t){m(this.#a,t,!0)}constructor(t){this.scrollbar=t,this.root=t.root,Ft(()=>{this.scrollbar.hasThumb=this.hasThumb}),Ft(()=>{!this.scrollbar.hasThumb&&this.thumbNode&&(this.prevTransformStyle=this.thumbNode.style.transform)})}setSizes(t){this.sizes=t}getScrollPosition(t,r){return ea({pointerPos:t,pointerOffset:this.pointerOffset,sizes:this.sizes,dir:r})}onThumbPointerUp(){this.pointerOffset=0}onThumbPointerDown(t){this.pointerOffset=t}xOnThumbPositionChange(){if(!(this.root.viewportNode&&this.thumbNode))return;const t=this.root.viewportNode.scrollLeft,o=`translate3d(${$o({scrollPos:t,sizes:this.sizes,dir:this.root.opts.dir.current})}px, 0, 0)`;this.thumbNode.style.transform=o,this.prevTransformStyle=o}xOnWheelScroll(t){this.root.viewportNode&&(this.root.viewportNode.scrollLeft=t)}xOnDragScroll(t){this.root.viewportNode&&(this.root.viewportNode.scrollLeft=this.getScrollPosition(t,this.root.opts.dir.current))}yOnThumbPositionChange(){if(!(this.root.viewportNode&&this.thumbNode))return;const t=this.root.viewportNode.scrollTop,o=`translate3d(0, ${$o({scrollPos:t,sizes:this.sizes})}px, 0)`;this.thumbNode.style.transform=o,this.prevTransformStyle=o}yOnWheelScroll(t){this.root.viewportNode&&(this.root.viewportNode.scrollTop=t)}yOnDragScroll(t){this.root.viewportNode&&(this.root.viewportNode.scrollTop=this.getScrollPosition(t,this.root.opts.dir.current))}}class ao{static create(t){return Jr.set(new ao(t,pr.get()))}opts;scrollbarVis;root;scrollbar;attachment;#t=T();get computedStyle(){return e(this.#t)}set computedStyle(t){m(this.#t,t,!0)}constructor(t,r){this.opts=t,this.scrollbarVis=r,this.root=r.root,this.scrollbar=r.scrollbar,this.attachment=de(this.scrollbar.opts.ref,o=>this.root.scrollbarXNode=o),Ft(()=>{this.scrollbar.opts.ref.current&&this.opts.mounted.current&&(this.computedStyle=getComputedStyle(this.scrollbar.opts.ref.current))}),Ft(()=>{this.onResize()})}onThumbPointerDown=t=>{this.scrollbarVis.onThumbPointerDown(t.x)};onDragScroll=t=>{this.scrollbarVis.xOnDragScroll(t.x)};onThumbPointerUp=()=>{this.scrollbarVis.onThumbPointerUp()};onThumbPositionChange=()=>{this.scrollbarVis.xOnThumbPositionChange()};onWheelScroll=(t,r)=>{if(!this.root.viewportNode)return;const o=this.root.viewportNode.scrollLeft+t.deltaX;this.scrollbarVis.xOnWheelScroll(o),Wo(o,r)&&t.preventDefault()};onResize=()=>{this.scrollbar.opts.ref.current&&this.root.viewportNode&&this.computedStyle&&this.scrollbarVis.setSizes({content:this.root.viewportNode.scrollWidth,viewport:this.root.viewportNode.offsetWidth,scrollbar:{size:this.scrollbar.opts.ref.current.clientWidth,paddingStart:ir(this.computedStyle.paddingLeft),paddingEnd:ir(this.computedStyle.paddingRight)}})};#e=$(()=>br(this.scrollbarVis.sizes));get thumbSize(){return e(this.#e)}set thumbSize(t){m(this.#e,t)}#r=$(()=>({id:this.scrollbar.opts.id.current,"data-orientation":"horizontal",style:{bottom:0,left:this.root.opts.dir.current==="rtl"?"var(--bits-scroll-area-corner-width)":0,right:this.root.opts.dir.current==="ltr"?"var(--bits-scroll-area-corner-width)":0,"--bits-scroll-area-thumb-width":`${this.thumbSize}px`},...this.attachment}));get props(){return e(this.#r)}set props(t){m(this.#r,t)}}class no{static create(t){return Jr.set(new no(t,pr.get()))}opts;scrollbarVis;root;scrollbar;attachment;#t=T();get computedStyle(){return e(this.#t)}set computedStyle(t){m(this.#t,t,!0)}constructor(t,r){this.opts=t,this.scrollbarVis=r,this.root=r.root,this.scrollbar=r.scrollbar,this.attachment=de(this.scrollbar.opts.ref,o=>this.root.scrollbarYNode=o),Ft(()=>{this.scrollbar.opts.ref.current&&this.opts.mounted.current&&(this.computedStyle=getComputedStyle(this.scrollbar.opts.ref.current))}),Ft(()=>{this.onResize()}),this.onThumbPointerDown=this.onThumbPointerDown.bind(this),this.onDragScroll=this.onDragScroll.bind(this),this.onThumbPointerUp=this.onThumbPointerUp.bind(this),this.onThumbPositionChange=this.onThumbPositionChange.bind(this),this.onWheelScroll=this.onWheelScroll.bind(this),this.onResize=this.onResize.bind(this)}onThumbPointerDown(t){this.scrollbarVis.onThumbPointerDown(t.y)}onDragScroll(t){this.scrollbarVis.yOnDragScroll(t.y)}onThumbPointerUp(){this.scrollbarVis.onThumbPointerUp()}onThumbPositionChange(){this.scrollbarVis.yOnThumbPositionChange()}onWheelScroll(t,r){if(!this.root.viewportNode)return;const o=this.root.viewportNode.scrollTop+t.deltaY;this.scrollbarVis.yOnWheelScroll(o),Wo(o,r)&&t.preventDefault()}onResize(){this.scrollbar.opts.ref.current&&this.root.viewportNode&&this.computedStyle&&this.scrollbarVis.setSizes({content:this.root.viewportNode.scrollHeight,viewport:this.root.viewportNode.offsetHeight,scrollbar:{size:this.scrollbar.opts.ref.current.clientHeight,paddingStart:ir(this.computedStyle.paddingTop),paddingEnd:ir(this.computedStyle.paddingBottom)}})}#e=$(()=>br(this.scrollbarVis.sizes));get thumbSize(){return e(this.#e)}set thumbSize(t){m(this.#e,t)}#r=$(()=>({id:this.scrollbar.opts.id.current,"data-orientation":"vertical",style:{top:0,right:this.root.opts.dir.current==="ltr"?0:void 0,left:this.root.opts.dir.current==="rtl"?0:void 0,bottom:"var(--bits-scroll-area-corner-height)","--bits-scroll-area-thumb-height":`${this.thumbSize}px`},...this.attachment}));get props(){return e(this.#r)}set props(t){m(this.#r,t)}}class io{static create(){return Yo.set(new io(Jr.get()))}scrollbarState;root;scrollbarVis;scrollbar;#t=T(null);get rect(){return e(this.#t)}set rect(t){m(this.#t,t)}#e=T("");get prevWebkitUserSelect(){return e(this.#e)}set prevWebkitUserSelect(t){m(this.#e,t,!0)}handleResize;handleThumbPositionChange;handleWheelScroll;handleThumbPointerDown;handleThumbPointerUp;#r=$(()=>this.scrollbarVis.sizes.content-this.scrollbarVis.sizes.viewport);get maxScrollPos(){return e(this.#r)}set maxScrollPos(t){m(this.#r,t)}constructor(t){this.scrollbarState=t,this.root=t.root,this.scrollbarVis=t.scrollbarVis,this.scrollbar=t.scrollbarVis.scrollbar,this.handleResize=fr(()=>this.scrollbarState.onResize(),10),this.handleThumbPositionChange=this.scrollbarState.onThumbPositionChange,this.handleWheelScroll=this.scrollbarState.onWheelScroll,this.handleThumbPointerDown=this.scrollbarState.onThumbPointerDown,this.handleThumbPointerUp=this.scrollbarState.onThumbPointerUp,Ft(()=>{const r=this.maxScrollPos,o=this.scrollbar.opts.ref.current;this.root.viewportNode;const a=n=>{const l=n.target;o?.contains(l)&&this.handleWheelScroll(n,r)};return Ze(this.root.domContext.getDocument(),"wheel",a,{passive:!1})}),cs(()=>{this.scrollbarVis.sizes,He(()=>this.handleThumbPositionChange())}),new qe(()=>this.scrollbar.opts.ref.current,this.handleResize),new qe(()=>this.root.contentNode,this.handleResize),this.onpointerdown=this.onpointerdown.bind(this),this.onpointermove=this.onpointermove.bind(this),this.onpointerup=this.onpointerup.bind(this)}handleDragScroll(t){if(!this.rect)return;const r=t.clientX-this.rect.left,o=t.clientY-this.rect.top;this.scrollbarState.onDragScroll({x:r,y:o})}onpointerdown(t){if(t.button!==0)return;t.target.setPointerCapture(t.pointerId),this.rect=this.scrollbar.opts.ref.current?.getBoundingClientRect()??null,this.prevWebkitUserSelect=this.root.domContext.getDocument().body.style.webkitUserSelect,this.root.domContext.getDocument().body.style.webkitUserSelect="none",this.root.viewportNode&&(this.root.viewportNode.style.scrollBehavior="auto"),this.handleDragScroll(t)}onpointermove(t){this.handleDragScroll(t)}onpointerup(t){const r=t.target;r.hasPointerCapture(t.pointerId)&&r.releasePointerCapture(t.pointerId),this.root.domContext.getDocument().body.style.webkitUserSelect=this.prevWebkitUserSelect,this.root.viewportNode&&(this.root.viewportNode.style.scrollBehavior=""),this.rect=null}#o=$(()=>Ht({...this.scrollbarState.props,style:{position:"absolute",...this.scrollbarState.props.style},[rr.scrollbar]:"",onpointerdown:this.onpointerdown,onpointermove:this.onpointermove,onpointerup:this.onpointerup}));get props(){return e(this.#o)}set props(t){m(this.#o,t)}}class lo{static create(t){return new lo(t,Yo.get())}opts;scrollbarState;attachment;#t;#e=T();#r=fr(()=>{e(this.#e)&&(e(this.#e)(),m(this.#e,void 0))},100);constructor(t,r){this.opts=t,this.scrollbarState=r,this.#t=r.root,this.attachment=de(this.opts.ref,o=>this.scrollbarState.scrollbarVis.thumbNode=o),Ft(()=>{const o=this.#t.viewportNode;if(!o)return;const a=()=>{if(this.#r(),!e(this.#e)){const n=ra(o,this.scrollbarState.handleThumbPositionChange);m(this.#e,n,!0),this.scrollbarState.handleThumbPositionChange()}};return He(()=>this.scrollbarState.handleThumbPositionChange()),Ze(o,"scroll",a)}),this.onpointerdowncapture=this.onpointerdowncapture.bind(this),this.onpointerup=this.onpointerup.bind(this)}onpointerdowncapture(t){const r=t.target;if(!r)return;const o=r.getBoundingClientRect(),a=t.clientX-o.left,i=t.clientY-o.top;this.scrollbarState.handleThumbPointerDown({x:a,y:i})}onpointerup(t){this.scrollbarState.handleThumbPointerUp()}#o=$(()=>({id:this.opts.id.current,"data-state":this.scrollbarState.scrollbarVis.hasThumb?"visible":"hidden",style:{width:"var(--bits-scroll-area-thumb-width)",height:"var(--bits-scroll-area-thumb-height)",transform:this.scrollbarState.scrollbarVis.prevTransformStyle},onpointerdowncapture:this.onpointerdowncapture,onpointerup:this.onpointerup,[rr.thumb]:"",...this.attachment}));get props(){return e(this.#o)}set props(t){m(this.#o,t)}}class co{static create(t){return new co(t,or.get())}opts;root;attachment;#t=T(0);#e=T(0);#r=$(()=>!!(e(this.#t)&&e(this.#e)));get hasSize(){return e(this.#r)}set hasSize(t){m(this.#r,t)}constructor(t,r){this.opts=t,this.root=r,this.attachment=de(this.opts.ref),new qe(()=>this.root.scrollbarXNode,()=>{const o=this.root.scrollbarXNode?.offsetHeight||0;this.root.cornerHeight=o,m(this.#e,o,!0)}),new qe(()=>this.root.scrollbarYNode,()=>{const o=this.root.scrollbarYNode?.offsetWidth||0;this.root.cornerWidth=o,m(this.#t,o,!0)})}#o=$(()=>({id:this.opts.id.current,style:{width:e(this.#t),height:e(this.#e),position:"absolute",right:this.root.opts.dir.current==="ltr"?0:void 0,left:this.root.opts.dir.current==="rtl"?0:void 0,bottom:0},[rr.corner]:"",...this.attachment}));get props(){return e(this.#o)}set props(t){m(this.#o,t)}}function ir(s){return s?Number.parseInt(s,10):0}function Ho(s,t){const r=s/t;return Number.isNaN(r)?0:r}function br(s){const t=Ho(s.viewport,s.content),r=s.scrollbar.paddingStart+s.scrollbar.paddingEnd,o=(s.scrollbar.size-r)*t;return Math.max(o,18)}function ea({pointerPos:s,pointerOffset:t,sizes:r,dir:o="ltr"}){const a=br(r),i=a/2,n=t||i,l=a-n,u=r.scrollbar.paddingStart+n,f=r.scrollbar.size-r.scrollbar.paddingEnd-l,_=r.content-r.viewport,b=o==="ltr"?[0,_]:[_*-1,0];return jo([u,f],b)(s)}function $o({scrollPos:s,sizes:t,dir:r="ltr"}){const o=br(t),a=t.scrollbar.paddingStart+t.scrollbar.paddingEnd,i=t.scrollbar.size-a,n=t.content-t.viewport,l=i-o,u=r==="ltr"?[0,n]:[n*-1,0],f=ta(s,u[0],u[1]);return jo([0,n],[0,l])(f)}function jo(s,t){return r=>{if(s[0]===s[1]||t[0]===t[1])return t[0];const o=(t[1]-t[0])/(s[1]-s[0]);return t[0]+o*(r-s[0])}}function Wo(s,t){return s>0&&s<t}function ra(s,t){let r={left:s.scrollLeft,top:s.scrollTop},o=0;const a=ms(s);return(function i(){const n={left:s.scrollLeft,top:s.scrollTop},l=r.left!==n.left,u=r.top!==n.top;(l||u)&&t(),r=n,o=a.requestAnimationFrame(i)})(),()=>a.cancelAnimationFrame(o)}var oa=y("<div><!></div>");function sa(s,t){const r=Pe();M(t,!0);let o=A(t,"ref",15,null),a=A(t,"id",19,()=>ke(r)),i=A(t,"type",3,"hover"),n=A(t,"dir",3,"ltr"),l=A(t,"scrollHideDelay",3,600),u=F(t,["$$slots","$$events","$$legacy","ref","id","type","dir","scrollHideDelay","children","child"]);const f=Zr.create({type:ot(()=>i()),dir:ot(()=>n()),scrollHideDelay:ot(()=>l()),id:ot(()=>a()),ref:ot(()=>o(),S=>o(S))}),_=$(()=>Ht(u,f.props));var b=E(),p=P(b);{var g=S=>{var N=E(),R=P(N);H(R,()=>t.child,()=>({props:e(_)})),d(S,N)},x=S=>{var N=oa();Ot(N,()=>({...e(_)}));var R=v(N);H(R,()=>t.children??J),c(N),d(S,N)};K(p,S=>{t.child?S(g):S(x,!1)})}d(s,b),z()}var aa=y("<div><div><!></div></div>");function na(s,t){const r=Pe();M(t,!0);let o=A(t,"ref",15,null),a=A(t,"id",19,()=>ke(r)),i=F(t,["$$slots","$$events","$$legacy","ref","id","children"]);const n=to.create({id:ot(()=>a()),ref:ot(()=>o(),p=>o(p))}),l=$(()=>Ht(i,n.props)),u=$(()=>Ht({},n.contentProps));var f=aa();Ot(f,()=>({...e(l)}));var _=v(f);Ot(_,()=>({...e(u)}));var b=v(_);H(b,()=>t.children??J),c(_),c(f),d(s,f),z()}var ia=y("<div><!></div>");function qo(s,t){M(t,!0);let r=F(t,["$$slots","$$events","$$legacy","child","children"]);const o=io.create(),a=$(()=>Ht(r,o.props));var i=E(),n=P(i);{var l=f=>{var _=E(),b=P(_);H(b,()=>t.child,()=>({props:e(a)})),d(f,_)},u=f=>{var _=ia();Ot(_,()=>({...e(a)}));var b=v(_);H(b,()=>t.children??J),c(_),d(f,_)};K(n,f=>{t.child?f(l):f(u,!1)})}d(s,i),z()}function la(s,t){M(t,!0);let r=F(t,["$$slots","$$events","$$legacy"]);const o=new Qr,a=ao.create({mounted:ot(()=>o.current)}),i=$(()=>Ht(r,a.props));qo(s,st(()=>e(i))),z()}function ca(s,t){M(t,!0);let r=F(t,["$$slots","$$events","$$legacy"]);const o=new Qr,a=no.create({mounted:ot(()=>o.current)}),i=$(()=>Ht(r,a.props));qo(s,st(()=>e(i))),z()}function mr(s,t){M(t,!0);let r=F(t,["$$slots","$$events","$$legacy"]);const o=so.create();var a=E(),i=P(a);{var n=u=>{la(u,st(()=>r))},l=u=>{ca(u,st(()=>r))};K(i,u=>{o.scrollbar.opts.orientation.current==="horizontal"?u(n):u(l,!1)})}d(s,a),z()}function da(s,t){M(t,!0);let r=A(t,"forceMount",3,!1),o=F(t,["$$slots","$$events","$$legacy","forceMount"]);const a=_r.create(),i=$(()=>Ht(o,a.props));{const n=u=>{mr(u,st(()=>e(i)))};let l=$(()=>r()||a.isVisible);hr(s,{get open(){return e(l)},get ref(){return a.scrollbar.opts.ref},presence:n,$$slots:{presence:!0}})}z()}function va(s,t){M(t,!0);let r=A(t,"forceMount",3,!1),o=F(t,["$$slots","$$events","$$legacy","forceMount"]);const a=oo.create(),i=$(()=>Ht(o,a.props));{const n=u=>{mr(u,st(()=>e(i)))};let l=$(()=>r()||!a.isHidden);hr(s,st(()=>e(i),{get open(){return e(l)},get ref(){return a.scrollbar.opts.ref},presence:n,$$slots:{presence:!0}}))}z()}function ua(s,t){M(t,!0);let r=A(t,"forceMount",3,!1),o=F(t,["$$slots","$$events","$$legacy","forceMount"]);const a=ro.create(),i=_r.create(),n=$(()=>Ht(o,a.props,i.props,{"data-state":a.isVisible?"visible":"hidden"})),l=$(()=>r()||a.isVisible&&i.isVisible);hr(s,{get open(){return e(l)},get ref(){return i.scrollbar.opts.ref},presence:f=>{mr(f,st(()=>e(n)))},$$slots:{presence:!0}}),z()}function ha(s,t){const r=Pe();M(t,!0);let o=A(t,"ref",15,null),a=A(t,"id",19,()=>ke(r)),i=F(t,["$$slots","$$events","$$legacy","ref","id","orientation"]);const n=eo.create({orientation:ot(()=>t.orientation),id:ot(()=>a()),ref:ot(()=>o(),p=>o(p))}),l=$(()=>n.root.opts.type.current);var u=E(),f=P(u);{var _=p=>{ua(p,st(()=>i,{get id(){return a()}}))},b=p=>{var g=E(),x=P(g);{var S=R=>{va(R,st(()=>i,{get id(){return a()}}))},N=R=>{var D=E(),C=P(D);{var X=nt=>{da(nt,st(()=>i,{get id(){return a()}}))},Q=nt=>{var Tt=E(),wt=P(Tt);{var bt=kt=>{mr(kt,st(()=>i,{get id(){return a()}}))};K(wt,kt=>{e(l)==="always"&&kt(bt)},!0)}d(nt,Tt)};K(C,nt=>{e(l)==="auto"?nt(X):nt(Q,!1)},!0)}d(R,D)};K(x,R=>{e(l)==="scroll"?R(S):R(N,!1)},!0)}d(p,g)};K(f,p=>{e(l)==="hover"?p(_):p(b,!1)})}d(s,u),z()}var fa=y("<div><!></div>");function pa(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","id","child","children","present"]);const a=new Qr,i=lo.create({id:ot(()=>t.id),ref:ot(()=>r(),b=>r(b)),mounted:ot(()=>a.current)}),n=$(()=>Ht(o,i.props,{style:{hidden:!t.present}}));var l=E(),u=P(l);{var f=b=>{var p=E(),g=P(p);H(g,()=>t.child,()=>({props:e(n)})),d(b,p)},_=b=>{var p=fa();Ot(p,()=>({...e(n)}));var g=v(p);H(g,()=>t.children??J),c(p),d(b,p)};K(u,b=>{t.child?b(f):b(_,!1)})}d(s,l),z()}function _a(s,t){const r=Pe();M(t,!0);let o=A(t,"id",19,()=>ke(r)),a=A(t,"ref",15,null),i=A(t,"forceMount",3,!1),n=F(t,["$$slots","$$events","$$legacy","id","ref","forceMount"]);const l=pr.get();{const u=(_,b)=>{let p=()=>b?.().present;pa(_,st(()=>n,{get id(){return o()},get present(){return p()},get ref(){return a()},set ref(g){a(g)}}))};let f=$(()=>i()||l.hasThumb);hr(s,{get open(){return e(f)},get ref(){return l.scrollbar.opts.ref},presence:u,$$slots:{presence:!0}})}z()}var ba=y("<div><!></div>");function ma(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","id","children","child"]);const a=co.create({id:ot(()=>t.id),ref:ot(()=>r(),_=>r(_))}),i=$(()=>Ht(o,a.props));var n=E(),l=P(n);{var u=_=>{var b=E(),p=P(b);H(p,()=>t.child,()=>({props:e(i)})),d(_,b)},f=_=>{var b=ba();Ot(b,()=>({...e(i)}));var p=v(b);H(p,()=>t.children??J),c(b),d(_,b)};K(l,_=>{t.child?_(u):_(f,!1)})}d(s,n),z()}function ga(s,t){const r=Pe();M(t,!0);let o=A(t,"ref",15,null),a=A(t,"id",19,()=>ke(r)),i=F(t,["$$slots","$$events","$$legacy","ref","id"]);const n=or.get(),l=$(()=>!!(n.scrollbarXNode&&n.scrollbarYNode)),u=$(()=>n.opts.type.current!=="scroll"&&e(l));var f=E(),_=P(f);{var b=p=>{ma(p,st(()=>i,{get id(){return a()},get ref(){return o()},set ref(g){o(g)}}))};K(_,p=>{e(u)&&p(b)})}d(s,f),z()}const lr=ur({component:"tabs",parts:["root","list","trigger","content"]}),vo=new Xe("Tabs.Root");class uo{static create(t){return vo.set(new uo(t))}opts;attachment;rovingFocusGroup;#t=T(We([]));get triggerIds(){return e(this.#t)}set triggerIds(t){m(this.#t,t,!0)}valueToTriggerId=new go;valueToContentId=new go;constructor(t){this.opts=t,this.attachment=de(t.ref),this.rovingFocusGroup=new Ss({candidateAttr:lr.trigger,rootNode:this.opts.ref,loop:this.opts.loop,orientation:this.opts.orientation})}registerTrigger(t,r){return this.triggerIds.push(t),this.valueToTriggerId.set(r,t),()=>{this.triggerIds=this.triggerIds.filter(o=>o!==t),this.valueToTriggerId.delete(r)}}registerContent(t,r){return this.valueToContentId.set(r,t),()=>{this.valueToContentId.delete(r)}}setValue(t){this.opts.value.current=t}#e=$(()=>({id:this.opts.id.current,"data-orientation":this.opts.orientation.current,[lr.root]:"",...this.attachment}));get props(){return e(this.#e)}set props(t){m(this.#e,t)}}class ho{static create(t){return new ho(t,vo.get())}opts;root;attachment;#t=$(()=>this.root.opts.disabled.current);constructor(t,r){this.opts=t,this.root=r,this.attachment=de(t.ref)}#e=$(()=>({id:this.opts.id.current,role:"tablist","aria-orientation":this.root.opts.orientation.current,"data-orientation":this.root.opts.orientation.current,[lr.list]:"","data-disabled":zo(e(this.#t)),...this.attachment}));get props(){return e(this.#e)}set props(t){m(this.#e,t)}}class fo{static create(t){return new fo(t,vo.get())}opts;root;attachment;#t=T(0);#e=$(()=>this.root.opts.value.current===this.opts.value.current);#r=$(()=>this.opts.disabled.current||this.root.opts.disabled.current);#o=$(()=>this.root.valueToContentId.get(this.opts.value.current));constructor(t,r){this.opts=t,this.root=r,this.attachment=de(t.ref),Mo([()=>this.opts.id.current,()=>this.opts.value.current],([o,a])=>this.root.registerTrigger(o,a)),Ft(()=>{this.root.triggerIds.length,e(this.#e)||!this.root.opts.value.current?m(this.#t,0):m(this.#t,-1)}),this.onfocus=this.onfocus.bind(this),this.onclick=this.onclick.bind(this),this.onkeydown=this.onkeydown.bind(this)}#s(){this.root.opts.value.current!==this.opts.value.current&&this.root.setValue(this.opts.value.current)}onfocus(t){this.root.opts.activationMode.current!=="automatic"||e(this.#r)||this.#s()}onclick(t){e(this.#r)||this.#s()}onkeydown(t){if(!e(this.#r)){if(t.key===ys||t.key===xs){t.preventDefault(),this.#s();return}this.root.rovingFocusGroup.handleKeydown(this.opts.ref.current,t)}}#a=$(()=>({id:this.opts.id.current,role:"tab","data-state":ya(e(this.#e)),"data-value":this.opts.value.current,"data-orientation":this.root.opts.orientation.current,"data-disabled":zo(e(this.#r)),"aria-selected":ws(e(this.#e)),"aria-controls":e(this.#o),[lr.trigger]:"",disabled:$s(e(this.#r)),tabindex:e(this.#t),onclick:this.onclick,onfocus:this.onfocus,onkeydown:this.onkeydown,...this.attachment}));get props(){return e(this.#a)}set props(t){m(this.#a,t)}}function ya(s){return s?"active":"inactive"}var xa=y("<div><!></div>");function $a(s,t){const r=Pe();M(t,!0);let o=A(t,"id",19,()=>ke(r)),a=A(t,"ref",15,null),i=A(t,"value",15,""),n=A(t,"onValueChange",3,Ps),l=A(t,"orientation",3,"horizontal"),u=A(t,"loop",3,!0),f=A(t,"activationMode",3,"automatic"),_=A(t,"disabled",3,!1),b=F(t,["$$slots","$$events","$$legacy","id","ref","value","onValueChange","orientation","loop","activationMode","disabled","children","child"]);const p=uo.create({id:ot(()=>o()),value:ot(()=>i(),D=>{i(D),n()(D)}),orientation:ot(()=>l()),loop:ot(()=>u()),activationMode:ot(()=>f()),disabled:ot(()=>_()),ref:ot(()=>a(),D=>a(D))}),g=$(()=>Ht(b,p.props));var x=E(),S=P(x);{var N=D=>{var C=E(),X=P(C);H(X,()=>t.child,()=>({props:e(g)})),d(D,C)},R=D=>{var C=xa();Ot(C,()=>({...e(g)}));var X=v(C);H(X,()=>t.children??J),c(C),d(D,C)};K(S,D=>{t.child?D(N):D(R,!1)})}d(s,x),z()}var wa=y("<div><!></div>");function Sa(s,t){const r=Pe();M(t,!0);let o=A(t,"id",19,()=>ke(r)),a=A(t,"ref",15,null),i=F(t,["$$slots","$$events","$$legacy","child","children","id","ref"]);const n=ho.create({id:ot(()=>o()),ref:ot(()=>a(),p=>a(p))}),l=$(()=>Ht(i,n.props));var u=E(),f=P(u);{var _=p=>{var g=E(),x=P(g);H(x,()=>t.child,()=>({props:e(l)})),d(p,g)},b=p=>{var g=wa();Ot(g,()=>({...e(l)}));var x=v(g);H(x,()=>t.children??J),c(g),d(p,g)};K(f,p=>{t.child?p(_):p(b,!1)})}d(s,u),z()}var Pa=y("<button><!></button>");function ka(s,t){const r=Pe();M(t,!0);let o=A(t,"disabled",3,!1),a=A(t,"id",19,()=>ke(r)),i=A(t,"type",3,"button"),n=A(t,"ref",15,null),l=F(t,["$$slots","$$events","$$legacy","child","children","disabled","id","type","value","ref"]);const u=fo.create({id:ot(()=>a()),disabled:ot(()=>o()??!1),value:ot(()=>t.value),ref:ot(()=>n(),x=>n(x))}),f=$(()=>Ht(l,u.props,{type:i()}));var _=E(),b=P(_);{var p=x=>{var S=E(),N=P(S);H(N,()=>t.child,()=>({props:e(f)})),d(x,S)},g=x=>{var S=Pa();Ot(S,()=>({...e(f)}));var N=v(S);H(N,()=>t.children??J),c(S),d(x,S)};K(b,x=>{t.child?x(p):x(g,!1)})}d(s,_),z()}function wo(s,t){M(t,!0);let r=A(t,"ref",15,null),o=A(t,"data-slot",3,"separator"),a=F(t,["$$slots","$$events","$$legacy","ref","class","data-slot"]);var i=E(),n=P(i);{let l=$(()=>Yt("bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",t.class));ae(n,()=>Gs,(u,f)=>{f(u,st({get"data-slot"(){return o()},get class(){return e(l)}},()=>a,{get ref(){return r()},set ref(_){r(_)}}))})}d(s,i),z()}function Ta(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"m12 19-7-7 7-7"}],["path",{d:"M19 12H5"}]];Kt(s,st({name:"arrow-left"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Na(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"m6 9 6 6 6-6"}]];Kt(s,st({name:"chevron-down"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Aa(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"m9 18 6-6-6-6"}]];Kt(s,st({name:"chevron-right"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Ca(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"}]];Kt(s,st({name:"flag"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Ea(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"M3 15h18"}],["path",{d:"M9 3v18"}],["path",{d:"M15 3v18"}]];Kt(s,st({name:"grid-3x3"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function La(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M3 5h.01"}],["path",{d:"M3 12h.01"}],["path",{d:"M3 19h.01"}],["path",{d:"M8 5h13"}],["path",{d:"M8 12h13"}],["path",{d:"M8 19h13"}]];Kt(s,st({name:"list"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Ma(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"}],["circle",{cx:"12",cy:"10",r:"3"}]];Kt(s,st({name:"map-pin"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function za(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2"}],["path",{d:"M3 9h18"}],["path",{d:"M9 21V9"}]];Kt(s,st({name:"panels-top-left"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Oa(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M12 17v5"}],["path",{d:"M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89"}],["path",{d:"m2 2 20 20"}],["path",{d:"M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11"}]];Kt(s,st({name:"pin-off"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Ra(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M12 17v5"}],["path",{d:"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"}]];Kt(s,st({name:"pin"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Ba(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"}],["path",{d:"M3 3v5h5"}]];Kt(s,st({name:"rotate-ccw"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Va(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"}],["path",{d:"m14.5 12.5 2-2"}],["path",{d:"m11.5 9.5 2-2"}],["path",{d:"m8.5 6.5 2-2"}],["path",{d:"m17.5 15.5 2-2"}]];Kt(s,st({name:"ruler"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Da(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7"}]];Kt(s,st({name:"save"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Ia(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M15 12h-5"}],["path",{d:"M15 8h-5"}],["path",{d:"M19 17V5a2 2 0 0 0-2-2H4"}],["path",{d:"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"}]];Kt(s,st({name:"scroll-text"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function Xo(s,t){M(t,!0);/**
 * @license @lucide/svelte v0.544.0 - ISC
 *
 * ISC License
 *
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * ---
 *
 * The MIT License (MIT) (for portions derived from Feather)
 *
 * Copyright (c) 2013-2023 Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */let r=F(t,["$$slots","$$events","$$legacy"]);const o=[["path",{d:"M18 6 6 18"}],["path",{d:"m6 6 12 12"}]];Kt(s,st({name:"x"},()=>r,{get iconNode(){return o},children:(a,i)=>{var n=E(),l=P(n);H(l,()=>t.children??J),d(a,n)},$$slots:{default:!0}})),z()}function xr(s,t){Gt(s,{variant:"ghost",class:"cursor-pointer rounded-md text-sm text-gray-800 transition-all duration-200  active:border-accent active:bg-accent active:text-white",children:(r,o)=>{var a=E(),i=P(a);H(i,()=>t.children??J),d(r,a)},$$slots:{default:!0}})}const Qo=vr(!1),Yr=vr(!1);var Ua=y('<!> <span class="text-sm font-medium text-stone-700"> </span>',1),Fa=y('<div><div class="blur-backdrop flex items-center gap-3 rounded-lg p-3"><a href="/" class="-ml-1 inline-flex items-center justify-center rounded-md p-2 text-stone-600 transition-colors hover:bg-stone-200/50 hover:text-stone-900" title="返回首页"><!></a> <!> <!> <div class="flex gap-2"><!> <!> <!></div> <!></div> <div class="blur-backdrop flex items-center gap-3 rounded-lg p-3 text-sm text-stone-900"><div class="flex flex-col gap-1"><div class="status-label">缩放级别</div> <div class="status-value"> </div></div> <div class="flex flex-col gap-1"><div class="status-label">单位数量</div> <div class="status-value"> </div></div> <div class="flex flex-col gap-1"><div class="status-label">选中单位</div> <div class="status-value"> </div></div> <div class="flex flex-col gap-1"><div class="status-label">当前阵营</div> <div class="status-value"> </div></div></div></div>');function Ya(s,t){M(t,!0);const r=()=>$t(qr,"$currentBattle",n),o=()=>$t(Bo,"$selectedPlacedUnit",n),a=()=>$t(Xr,"$currentFaction",n),i=()=>$t(Ts,"$zoom",n),[n,l]=ge();function u(){Ro(null),Qo.update(it=>!it)}let f=$(()=>r()?.placedUnits.length??0),_=$(()=>{const it=o(),gt=r();if(!it||!gt)return"无";for(const Vt of gt.factions){const ut=Vt.units.find(ft=>ft.id===it.unitId);if(ut)return ut.name}return"无"}),b=$(()=>a()?.name??"未选择");var p=Fa(),g=v(p),x=v(g),S=v(x);Ta(S,{class:"h-5 w-5"}),c(x);var N=h(x,2);wo(N,{orientation:"vertical",class:"h-6"});var R=h(N,2);Gt(R,{variant:"ghost",class:"cursor-pointer rounded-md text-sm text-gray-800 transition-all duration-200  active:border-accent active:bg-accent active:text-white",size:"icon",onclick:u,title:"切换侧边栏固定",children:(it,gt)=>{za(it,{})},$$slots:{default:!0}});var D=h(R,2),C=v(D);xr(C,{children:(it,gt)=>{Qt();var Vt=Ve("标准");d(it,Vt)}});var X=h(C,2);xr(X,{children:(it,gt)=>{Qt();var Vt=Ve("地形");d(it,Vt)}});var Q=h(X,2);xr(Q,{children:(it,gt)=>{Qt();var Vt=Ve("卫星");d(it,Vt)}}),c(D);var nt=h(D,2);{var Tt=it=>{var gt=Ua(),Vt=P(gt);wo(Vt,{orientation:"vertical",class:"h-6"});var ut=h(Vt,2),ft=v(ut,!0);c(ut),B(()=>O(ft,r().name)),d(it,gt)};K(nt,it=>{r()&&it(Tt)})}c(g);var wt=h(g,2),bt=v(wt),kt=h(v(bt),2),jt=v(kt,!0);c(kt),c(bt);var ee=h(bt,2),Nt=h(v(ee),2),Rt=v(Nt,!0);c(Nt),c(ee);var Bt=h(ee,2),At=h(v(Bt),2),Jt=v(At,!0);c(At),c(Bt);var Wt=h(Bt,2),qt=h(v(Wt),2),ye=v(qt,!0);c(qt),c(Wt),c(wt),c(p),B(it=>{tr(p,1,it),O(jt,i()),O(Rt,e(f)),O(Jt,e(_)),O(ye,e(b))},[()=>Eo(Yt("absolute top-5 right-5 left-5 z-1000 flex justify-between",t.class))]),d(s,p),z(),l()}function Qe(s,t){Gt(s,{variant:"ghost",class:"cursor-pointer rounded-md text-sm text-gray-800 transition-all duration-200  active:border-accent active:bg-accent active:text-white",get title(){return t.title},children:(r,o)=>{var a=E(),i=P(a);H(i,()=>t.children??J),d(r,a)},$$slots:{default:!0}})}const cr=vr(!1);function So(s){return Object.prototype.toString.call(s)==="[object Date]"}function Go(s){return s}function me(s){return s<.5?4*s*s*s:.5*Math.pow(2*s-2,3)+1}function Po(s){return--s*s*s*s*s+1}function Hr(s,t){if(s===t||s!==s)return()=>s;const r=typeof s;if(r!==typeof t||Array.isArray(s)!==Array.isArray(t))throw new Error("Cannot interpolate values of different type");if(Array.isArray(s)){const o=t.map((a,i)=>Hr(s[i],a));return a=>o.map(i=>i(a))}if(r==="object"){if(!s||!t)throw new Error("Object cannot be null");if(So(s)&&So(t)){const i=s.getTime(),l=t.getTime()-i;return u=>new Date(i+u*l)}const o=Object.keys(t),a={};return o.forEach(i=>{a[i]=Hr(s[i],t[i])}),i=>{const n={};return o.forEach(l=>{n[l]=a[l](i)}),n}}if(r==="number"){const o=t-s;return a=>s+a*o}return()=>t}function dr(s,t={}){const r=vr(s);let o,a=s;function i(n,l){if(a=n,s==null)return r.set(s=n),Promise.resolve();let u=o,f=!1,{delay:_=0,duration:b=400,easing:p=Go,interpolate:g=Hr}={...t,...l};if(b===0)return u&&(u.abort(),u=null),r.set(s=a),Promise.resolve();const x=Se.now()+_;let S;return o=Fo(N=>{if(N<x)return!0;f||(S=g(s,n),typeof b=="function"&&(b=b(s,n)),f=!0),u&&(u.abort(),u=null);const R=N-x;return R>b?(r.set(s=n),!1):(r.set(s=S(p(R/b))),!0)}),o.promise}return{set:i,update:(n,l)=>i(n(a,s),l),subscribe:r.subscribe}}function Ha(s,t){M(t,!1);const r=()=>$t(cr,"$settingOpen",i),o=()=>$t(l,"$rotate",i),a=()=>$t(u,"$scale",i),[i,n]=ge(),l=dr(0,{duration:300,easing:me}),u=dr(1,{duration:200,easing:me});let f=!1;async function _(){for(f=!0,u.set(1.15,{duration:100,easing:me});f&&(await l.set(360,{duration:4e3,easing:Go}),!!f);)l.set(0,{duration:0})}function b(){f=!1,u.set(1,{duration:100,easing:me}),l.set(0,{duration:300,easing:me})}async function p(){cr.update(g=>!g),console.log(r()),await l.set(180,{duration:400,easing:me}),l.set(0,{duration:0}),f=!0}er(),Gt(s,{variant:"ghost",onclick:p,size:"icon",onmouseenter:_,onmouseleave:b,children:(g,x)=>{Vs(g,{class:"select-none",get style(){return`transform: rotate(${o()??""}deg) scale(${a()??""})`}})},$$slots:{default:!0}}),z(),n()}function ja(s,t){M(t,!1);const r=()=>$t(n,"$rotate",a),o=()=>$t(l,"$scale",a),[a,i]=ge(),n=dr(0,{duration:300,easing:me}),l=dr(1,{duration:200,easing:me});function u(){l.set(1.15,{duration:100,easing:me})}function f(){l.set(1,{duration:100,easing:me})}async function _(){hs("确认重置","此操作将清空当前战局所有阵营、单位和日志，且无法撤销。是否继续？",async()=>{await n.set(360,{duration:400,easing:me}),n.set(0,{duration:0}),Cs(),Lo("已重置","当前战局已清空所有阵营、单位和日志。")})}er(),Gt(s,{variant:"ghost",onclick:_,size:"icon",onmouseenter:u,onmouseleave:f,children:(b,p)=>{Ba(b,{class:"select-none",get style(){return`transform: rotate(${r()??""}deg) scale(${o()??""})`}})},$$slots:{default:!0}}),z(),i()}function Wa(s,t){M(t,!1);const r=()=>$t(Yr,"$rightBarPinned",o),[o,a]=ge();function i(){Yr.update(n=>!n)}er(),Gt(s,{variant:"ghost",size:"icon",onclick:i,title:"切换侧边栏固定",children:(n,l)=>{var u=E(),f=P(u);{var _=p=>{Ra(p,{})},b=p=>{Oa(p,{})};K(f,p=>{r()?p(_):p(b,!1)})}d(n,u)},$$slots:{default:!0}}),z(),a()}var qa=y('<div class="sidebar blur-backdrop absolute top-30 bottom-30 z-1000 flex w-15 flex-1 flex-col justify-between overflow-hidden rounded-lg svelte-bewwik"><div class="toggle-btn svelte-bewwik"><!></div> <div class="panel-section svelte-bewwik"><div class="controls svelte-bewwik"><!> <!></div></div> <div class="panel-section svelte-bewwik"><div class="controls svelte-bewwik"><!> <!> <!></div></div></div>');function Xa(s,t){M(t,!0);const r=()=>$t(Yr,"$rightBarPinned",o),[o,a]=ge();let i=T(!1);var n=qa();let l;var u=v(n),f=v(u);Wa(f,{}),c(u);var _=h(u,2),b=v(_),p=v(b);Qe(p,{title:"切换网格显示",children:(C,X)=>{Gt(C,{variant:"ghost",size:"icon",children:(Q,nt)=>{Ea(Q,{})},$$slots:{default:!0}})}});var g=h(p,2);Qe(g,{title:"测量距离",children:(C,X)=>{Gt(C,{variant:"ghost",size:"icon",children:(Q,nt)=>{Va(Q,{})},$$slots:{default:!0}})}}),c(b),c(_);var x=h(_,2),S=v(x),N=v(S);Qe(N,{title:"保存",children:(C,X)=>{Gt(C,{variant:"ghost",size:"icon",onclick:()=>Lo("已保存","当前推演状态已自动保存到浏览器。"),children:(Q,nt)=>{Da(Q,{})},$$slots:{default:!0}})}});var R=h(N,2);Qe(R,{title:"重置推演",children:(C,X)=>{ja(C,{})}});var D=h(R,2);Qe(D,{title:"设置",children:(C,X)=>{Ha(C,{})}}),c(S),c(x),c(n),B(C=>l=Ke(n,"",l,C),[()=>({right:r()?"20px":e(i)?"0px":"-50px"})]),_o("mouseenter",n,()=>m(i,!0)),_o("mouseleave",n,()=>m(i,!1)),d(s,n),z(),a()}var Qa=y('<div class="bottom-5 left-5 right-5 bottom-status flex justify-end z-1000 absolute"><div class="coordinates rounded-lg blur-backdrop svelte-1n97ort"> </div></div>');function Ga(s,t){M(t,!1);const r=()=>$t(Ns,"$coords",o),[o,a]=ge();er();var i=Qa(),n=v(i),l=v(n);c(n),c(i),B((u,f)=>O(l,`坐标: ${u??""}, ${f??""}`),[()=>r().lat.toFixed(5),()=>r().lng.toFixed(5)]),d(s,i),z(),a()}function Ka(s,t,r,o){m(t,!0),m(r,{x:s.clientX-e(o).x,y:s.clientY-e(o).y},!0),s.preventDefault()}var Ja=()=>Es.set(null),Za=y('<div class="prop-row svelte-t47x5s"><span class="prop-label svelte-t47x5s">打击范围</span> <span> </span></div>'),tn=y('<div class="detail-item svelte-t47x5s"> </div>'),en=y('<div class="detail-item svelte-t47x5s"> </div>'),rn=y('<div class="detail-item svelte-t47x5s"> </div>'),on=y("<!> <!> <!>",1),sn=y('<div class="detail-item svelte-t47x5s"> </div>'),an=y('<div class="detail-item svelte-t47x5s"> </div>'),nn=y('<div class="detail-item svelte-t47x5s"> </div>'),ln=y("<!> <!> <!>",1),cn=y('<div class="detail-item svelte-t47x5s"> </div>'),dn=y('<div class="detail-item svelte-t47x5s"> </div>'),vn=y('<div class="detail-item svelte-t47x5s"> </div>'),un=y("<!> <!> <!>",1),hn=y('<div class="blur-backdrop fixed z-1000 rounded-lg"><div class="prop-panel svelte-t47x5s"><div class="prop-header svelte-t47x5s"><div class="prop-title svelte-t47x5s"><span class="faction-dot svelte-t47x5s"></span> <strong> </strong></div> <button class="close-btn svelte-t47x5s"><!></button></div> <div class="prop-row svelte-t47x5s"><span class="prop-label svelte-t47x5s">阵营</span> <span> </span></div> <div class="prop-row svelte-t47x5s"><span class="prop-label svelte-t47x5s">军种</span> <span> </span></div> <div class="prop-row svelte-t47x5s"><span class="prop-label svelte-t47x5s">状态</span> <span> </span></div> <div class="prop-row svelte-t47x5s"><span class="prop-label svelte-t47x5s">坐标</span> <span> </span></div> <!> <div class="prop-details svelte-t47x5s"><!></div></div></div>');function fn(s,t){M(t,!0);const r=()=>$t(Bo,"$selectedPlacedUnit",a),o=()=>$t(qr,"$currentBattle",a),[a,i]=ge();let n=T(We({x:40,y:100})),l=T(!1),u=T(We({x:0,y:0}));Ft(()=>{function g(S){if(!e(l))return;const N=Math.max(0,Math.min(window.innerWidth-100,S.clientX-e(u).x)),R=Math.max(0,Math.min(window.innerHeight-50,S.clientY-e(u).y));m(n,{x:N,y:R},!0)}function x(){m(l,!1)}return window.addEventListener("mousemove",g),window.addEventListener("mouseup",x),()=>{window.removeEventListener("mousemove",g),window.removeEventListener("mouseup",x)}});let f=$(()=>{const g=r(),x=o();if(!g||!x)return null;for(const S of x.factions){const N=S.units.find(R=>R.id===g.unitId);if(N)return{unit:N,faction:S,placed:g}}return null});var _=E(),b=P(_);{var p=g=>{var x=hn();let S;var N=v(x),R=v(N);R.__mousedown=[Ka,l,u,n];let D;var C=v(R),X=v(C);let Q;var nt=h(X,2),Tt=v(nt,!0);c(nt),c(C);var wt=h(C,2);wt.__click=[Ja];var bt=v(wt);Xo(bt,{size:14}),c(wt),c(R);var kt=h(R,2),jt=h(v(kt),2),ee=v(jt,!0);c(jt),c(kt);var Nt=h(kt,2),Rt=h(v(Nt),2),Bt=v(Rt,!0);c(Rt),c(Nt);var At=h(Nt,2),Jt=h(v(At),2),Wt=v(Jt,!0);c(Jt),c(At);var qt=h(At,2),ye=h(v(qt),2),it=v(ye);c(ye),c(qt);var gt=h(qt,2);{var Vt=mt=>{var Ct=Za(),_t=h(v(Ct),2),Y=v(_t);c(_t),c(Ct),B(et=>O(Y,`${et??""} km`),[()=>(e(f).placed.strikeRadius/1e3).toFixed(1)]),d(mt,Ct)};K(gt,mt=>{e(f).placed.strikeRadius>0&&mt(Vt)})}var ut=h(gt,2),ft=v(ut);{var re=mt=>{const Ct=$(()=>e(f).unit);var _t=on(),Y=P(_t);G(Y,17,()=>e(Ct).infantry,pt,(ct,ht)=>{var yt=tn(),Et=v(yt);c(yt),B(()=>O(Et,`🪖 ${Sr[e(ht).type]??""} · ${Pr[e(ht).quality]??""} × ${e(ht).count??""}`)),d(ct,yt)});var et=h(Y,2);G(et,17,()=>e(Ct).armor,pt,(ct,ht)=>{var yt=en(),Et=v(yt);c(yt),B(()=>O(Et,`🛡️ ${kr[e(ht).type]??""} · ${Tr[e(ht).quality]??""} × ${e(ht).count??""}`)),d(ct,yt)});var Z=h(et,2);G(Z,17,()=>e(Ct).missiles,pt,(ct,ht)=>{var yt=rn(),Et=v(yt);c(yt),B(()=>O(Et,`🚀 ${Nr[e(ht).type]??""} · ${Ar[e(ht).quality]??""} × ${e(ht).count??""}`)),d(ct,yt)}),d(mt,_t)},Zt=mt=>{var Ct=E(),_t=P(Ct);{var Y=Z=>{const ct=$(()=>e(f).unit);var ht=ln(),yt=P(ht);G(yt,17,()=>e(ct).surface,pt,(Xt,St)=>{var Lt=sn(),ie=v(Lt);c(Lt),B(()=>O(ie,`🚢 ${Cr[e(St).type]??""} · ${Er[e(St).quality]??""} × ${e(St).count??""}`)),d(Xt,Lt)});var Et=h(yt,2);G(Et,17,()=>e(ct).submarines,pt,(Xt,St)=>{var Lt=an(),ie=v(Lt);c(Lt),B(()=>O(ie,`🔱 ${Lr[e(St).type]??""} · ${Mr[e(St).quality]??""} × ${e(St).count??""}`)),d(Xt,Lt)});var ne=h(Et,2);G(ne,17,()=>e(ct).support,pt,(Xt,St)=>{var Lt=nn(),ie=v(Lt);c(Lt),B(()=>O(ie,`⚓ ${zr[e(St).type]??""} · ${Or[e(St).quality]??""} × ${e(St).count??""}`)),d(Xt,Lt)}),d(Z,ht)},et=Z=>{var ct=E(),ht=P(ct);{var yt=Et=>{const ne=$(()=>e(f).unit);var Xt=un(),St=P(Xt);G(St,17,()=>e(ne).fighters,pt,(Ne,at)=>{var dt=cn(),Pt=v(dt);c(dt),B(()=>O(Pt,`✈️ ${Rr[e(at).type]??""} · ${Br[e(at).quality]??""} × ${e(at).count??""}`)),d(Ne,dt)});var Lt=h(St,2);G(Lt,17,()=>e(ne).bombers,pt,(Ne,at)=>{var dt=dn(),Pt=v(dt);c(dt),B(()=>O(Pt,`💣 ${Vr[e(at).type]??""} · ${Dr[e(at).quality]??""} × ${e(at).count??""}`)),d(Ne,dt)});var ie=h(Lt,2);G(ie,17,()=>e(ne).support,pt,(Ne,at)=>{var dt=vn(),Pt=v(dt);c(dt),B(()=>O(Pt,`📡 ${Ir[e(at).type]??""} · ${Ur[e(at).quality]??""} × ${e(at).count??""}`)),d(Ne,dt)}),d(Et,Xt)};K(ht,Et=>{e(f).unit.branch==="air_force"&&Et(yt)},!0)}d(Z,ct)};K(_t,Z=>{e(f).unit.branch==="navy"?Z(Y):Z(et,!1)},!0)}d(mt,Ct)};K(ft,mt=>{e(f).unit.branch==="army"?mt(re):mt(Zt,!1)})}c(ut),c(N),c(x),B((mt,Ct,_t,Y,et)=>{S=Ke(x,"",S,mt),D=Ke(R,"",D,Ct),Q=Ke(X,"",Q,_t),O(Tt,e(f).unit.name),O(ee,e(f).faction.name),O(Bt,Oo[e(f).unit.branch]),O(Wt,As[e(f).placed.status]),O(it,`${Y??""}, ${et??""}`)},[()=>({left:`${e(n).x??""}px`,top:`${e(n).y??""}px`,"user-select":e(l)?"none":"auto"}),()=>({cursor:e(l)?"grabbing":"grab"}),()=>({"background-color":e(f).faction.color}),()=>e(f).placed.lat.toFixed(4),()=>e(f).placed.lng.toFixed(4)]),d(g,x)};K(b,g=>{e(f)&&g(p)})}d(s,_),z(),i()}Co(["mousedown","click"]);const pn=s=>s;function _n(s){const t=s-1;return t*t*t+1}function ko(s){const t=typeof s=="string"&&s.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);return t?[parseFloat(t[1]),t[2]||"px"]:[s,"px"]}function jr(s,{delay:t=0,duration:r=400,easing:o=pn}={}){const a=+getComputedStyle(s).opacity;return{delay:t,duration:r,easing:o,css:i=>`opacity: ${i*a}`}}function To(s,{delay:t=0,duration:r=400,easing:o=_n,x:a=0,y:i=0,opacity:n=0}={}){const l=getComputedStyle(s),u=+l.opacity,f=l.transform==="none"?"":l.transform,_=u*(1-n),[b,p]=ko(a),[g,x]=ko(i);return{delay:t,duration:r,easing:o,css:(S,N)=>`
			transform: ${f} translate(${(1-S)*b}${p}, ${(1-S)*g}${x});
			opacity: ${u-_*N}`}}var bn=y("<input/>"),mn=y("<input/>");function gn(s,t){M(t,!0);let r=A(t,"ref",15,null),o=A(t,"value",15),a=A(t,"files",15),i=A(t,"data-slot",3,"input"),n=F(t,["$$slots","$$events","$$legacy","ref","value","type","files","class","data-slot"]);var l=E(),u=P(l);{var f=b=>{var p=bn();Ot(p,g=>({"data-slot":i(),class:g,type:"file",...n}),[()=>Yt("selection:bg-primary dark:bg-input/30 selection:text-primary-foreground border-input ring-offset-background placeholder:text-muted-foreground shadow-xs flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 pt-1.5 text-sm font-medium outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50","focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]","aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",t.class)],void 0,void 0,!0),je(p,g=>r(g),()=>r()),Ds(p,a),ce(p,o),d(b,p)},_=b=>{var p=mn();Ot(p,g=>({"data-slot":i(),class:g,type:t.type,...n}),[()=>Yt("border-input bg-background selection:bg-primary dark:bg-input/30 selection:text-primary-foreground ring-offset-background placeholder:text-muted-foreground shadow-xs flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm","focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]","aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",t.class)],void 0,void 0,!0),je(p,g=>r(g),()=>r()),ce(p,o),d(b,p)};K(u,b=>{t.type==="file"?b(f):b(_,!1)})}d(s,l),z()}function Je(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","class"]);var a=E(),i=P(a);{let n=$(()=>Yt("flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",t.class));ae(i,()=>Zs,(l,u)=>{u(l,st({"data-slot":"label",get class(){return e(n)}},()=>o,{get ref(){return r()},set ref(f){r(f)}}))})}d(s,a),z()}var yn=y("<div><!></div>");function xn(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","class","children"]);var a=yn();Ot(a,n=>({"data-slot":"card",class:n,...o}),[()=>Yt("bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",t.class)]);var i=v(a);H(i,()=>t.children??J),c(a),je(a,n=>r(n),()=>r()),d(s,a),z()}var $n=y("<div><!></div>");function wn(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","class","children"]);var a=$n();Ot(a,n=>({"data-slot":"card-content",class:n,...o}),[()=>Yt("px-6",t.class)]);var i=v(a);H(i,()=>t.children??J),c(a),je(a,n=>r(n),()=>r()),d(s,a),z()}var Sn=y("<p><!></p>");function Pn(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","class","children"]);var a=Sn();Ot(a,n=>({"data-slot":"card-description",class:n,...o}),[()=>Yt("text-muted-foreground text-sm",t.class)]);var i=v(a);H(i,()=>t.children??J),c(a),je(a,n=>r(n),()=>r()),d(s,a),z()}var kn=y("<div><!></div>");function Tn(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","class","children"]);var a=kn();Ot(a,n=>({"data-slot":"card-header",class:n,...o}),[()=>Yt("@container/card-header has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6",t.class)]);var i=v(a);H(i,()=>t.children??J),c(a),je(a,n=>r(n),()=>r()),d(s,a),z()}var Nn=y("<div><!></div>");function An(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","class","children"]);var a=Nn();Ot(a,n=>({"data-slot":"card-title",class:n,...o}),[()=>Yt("font-semibold leading-none",t.class)]);var i=v(a);H(i,()=>t.children??J),c(a),je(a,n=>r(n),()=>r()),d(s,a),z()}var Cn=y("<!> <!>",1);function No(s,t){M(t,!0);let r=A(t,"ref",15,null),o=A(t,"orientation",3,"vertical"),a=F(t,["$$slots","$$events","$$legacy","ref","class","orientation","children"]);var i=E(),n=P(i);{let l=$(()=>Yt("flex touch-none select-none p-px transition-colors",o()==="vertical"&&"h-full w-2.5 border-l border-l-transparent",o()==="horizontal"&&"h-2.5 flex-col border-t border-t-transparent",t.class));ae(n,()=>ha,(u,f)=>{f(u,st({"data-slot":"scroll-area-scrollbar",get orientation(){return o()},get class(){return e(l)}},()=>a,{get ref(){return r()},set ref(_){r(_)},children:(_,b)=>{var p=Cn(),g=P(p);H(g,()=>t.children??J);var x=h(g,2);ae(x,()=>_a,(S,N)=>{N(S,{"data-slot":"scroll-area-thumb",class:"bg-border relative flex-1 rounded-full"})}),d(_,p)},$$slots:{default:!0}}))})}d(s,i),z()}var En=y("<!> <!> <!> <!>",1);function Wr(s,t){M(t,!0);let r=A(t,"ref",15,null),o=A(t,"orientation",3,"vertical"),a=A(t,"scrollbarXClasses",3,""),i=A(t,"scrollbarYClasses",3,""),n=F(t,["$$slots","$$events","$$legacy","ref","class","orientation","scrollbarXClasses","scrollbarYClasses","children"]);var l=E(),u=P(l);{let f=$(()=>Yt("relative",t.class));ae(u,()=>sa,(_,b)=>{b(_,st({"data-slot":"scroll-area",get class(){return e(f)}},()=>n,{get ref(){return r()},set ref(p){r(p)},children:(p,g)=>{var x=En(),S=P(x);ae(S,()=>na,(Q,nt)=>{nt(Q,{"data-slot":"scroll-area-viewport",class:"ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-4",children:(Tt,wt)=>{var bt=E(),kt=P(bt);H(kt,()=>t.children??J),d(Tt,bt)},$$slots:{default:!0}})});var N=h(S,2);{var R=Q=>{No(Q,{orientation:"vertical",get class(){return i()}})};K(N,Q=>{(o()==="vertical"||o()==="both")&&Q(R)})}var D=h(N,2);{var C=Q=>{No(Q,{orientation:"horizontal",get class(){return a()}})};K(D,Q=>{(o()==="horizontal"||o()==="both")&&Q(C)})}var X=h(D,2);ae(X,()=>ga,(Q,nt)=>{nt(Q,{})}),d(p,x)},$$slots:{default:!0}}))})}d(s,l),z()}var Ln=y('<span class="h-3 w-3 shrink-0 rounded-full ring-2 ring-background"></span> <span class="truncate text-sm font-medium"> </span>',1),Mn=y("<div><!> <!></div>");function zn(s,t){M(t,!0);const r=()=>$t(Do,"$currentFactionId",o),[o,a]=ge();var i=Mn();let n;var l=v(i);{let f=$(()=>r()===t.faction.id?"点击取消选择":"点击选择阵营");Gt(l,{type:"button",variant:"ghost",class:"flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left",get title(){return e(f)},onclick:()=>Ro(t.faction.id),children:(_,b)=>{var p=Ln(),g=P(p);let x;var S=h(g,2),N=v(S,!0);c(S),B(R=>{x=Ke(g,"",x,R),O(N,t.faction.name)},[()=>({"background-color":t.faction.color})]),d(_,p)},$$slots:{default:!0}})}var u=h(l,2);Gt(u,{type:"button",variant:"ghost",size:"icon",class:"h-7 w-7 text-muted-foreground hover:text-destructive",title:"删除阵营",onclick:f=>{f.stopPropagation(),Ls(t.faction.id)},children:(f,_)=>{Vo(f,{class:"h-4 w-4"})},$$slots:{default:!0}}),c(i),B(f=>n=tr(i,1,"group flex items-center justify-between gap-2 rounded-lg border px-2 py-2 transition-all",null,n,f),[()=>({"border-primary":r()===t.faction.id,"bg-muted":r()===t.faction.id})]),d(s,i),z(),a()}function On(s,t,r,o,a,i,n){!t()||!e(r)||Te(t(),e(r),l=>l.branch!=="army"?l:{...l,infantry:[...l.infantry,{id:o(),type:e(a),quality:e(i),count:e(n)}]})}function Rn(s,t,r,o,a,i,n){!t()||!e(r)||Te(t(),e(r),l=>l.branch!=="army"?l:{...l,armor:[...l.armor,{id:o(),type:e(a),quality:e(i),count:e(n)}]})}function Bn(s,t,r,o,a,i,n){!t()||!e(r)||Te(t(),e(r),l=>l.branch!=="army"?l:{...l,missiles:[...l.missiles,{id:o(),type:e(a),quality:e(i),count:e(n)}]})}function Vn(s,t,r,o,a,i,n){!t()||!e(r)||Te(t(),e(r),l=>l.branch!=="navy"?l:{...l,surface:[...l.surface,{id:o(),type:e(a),quality:e(i),count:e(n)}]})}function Dn(s,t,r,o,a,i,n){!t()||!e(r)||Te(t(),e(r),l=>l.branch!=="navy"?l:{...l,submarines:[...l.submarines,{id:o(),type:e(a),quality:e(i),count:e(n)}]})}function In(s,t,r,o,a,i,n){!t()||!e(r)||Te(t(),e(r),l=>l.branch!=="navy"?l:{...l,support:[...l.support,{id:o(),type:e(a),quality:e(i),count:e(n)}]})}function Un(s,t,r,o,a,i,n){!t()||!e(r)||Te(t(),e(r),l=>l.branch!=="air_force"?l:{...l,fighters:[...l.fighters,{id:o(),type:e(a),quality:e(i),count:e(n)}]})}function Fn(s,t,r,o,a,i,n){!t()||!e(r)||Te(t(),e(r),l=>l.branch!=="air_force"?l:{...l,bombers:[...l.bombers,{id:o(),type:e(a),quality:e(i),count:e(n)}]})}function Yn(s,t,r,o,a,i,n){!t()||!e(r)||Te(t(),e(r),l=>l.branch!=="air_force"?l:{...l,support:[...l.support,{id:o(),type:e(a),quality:e(i),count:e(n)}]})}var Hn=y('<p class="empty-hint svelte-1ookxvc">请先选择阵营</p>'),jn=y("<button> </button>"),Wn=(s,t)=>{s.key==="Enter"&&t()},qn=(s,t,r)=>t(e(r).id),Xn=(s,t,r)=>{(s.key==="Enter"||s.key===" ")&&t(e(r).id)},Qn=(s,t,r)=>{s.stopPropagation(),t(e(r).id)},Gn=(s,t,r,o)=>{s.stopPropagation(),Rs(t(),e(r).id),e(o)===e(r).id&&m(o,null)},Kn=y('<div><div class="unit-header" role="button" tabindex="0"><div class="unit-info"><!> <span class="unit-name"> </span></div> <div class="unit-actions svelte-1ookxvc"><button class="unit-action-btn place svelte-1ookxvc" title="放置到地图"><!></button> <button class="unit-action-btn delete svelte-1ookxvc" title="删除"><!></button></div></div></div>'),Jn=y('<p class="empty-hint svelte-1ookxvc">暂无单位，输入名称快速创建</p>'),Zn=(s,t,r)=>t(e(r).id),ti=y('<div class="component-item svelte-1ookxvc"><span> </span> <button class="remove-btn svelte-1ookxvc">✕</button></div>'),ei=y("<option> </option>"),ri=y("<option> </option>"),oi=(s,t,r)=>t(e(r).id),si=y('<div class="component-item svelte-1ookxvc"><span> </span> <button class="remove-btn svelte-1ookxvc">✕</button></div>'),ai=y("<option> </option>"),ni=y("<option> </option>"),ii=(s,t,r)=>t(e(r).id),li=y('<div class="component-item svelte-1ookxvc"><span> </span> <button class="remove-btn svelte-1ookxvc">✕</button></div>'),ci=y("<option> </option>"),di=y("<option> </option>"),vi=y('<div class="component-group svelte-1ookxvc"><div class="component-title svelte-1ookxvc">🪖 步兵</div> <!> <div class="component-add"><select></select> <select></select> <input type="number" min="1" max="10000"/> <button class="comp-add-btn">+</button></div></div> <div class="component-group svelte-1ookxvc"><div class="component-title svelte-1ookxvc">🛡️ 装甲</div> <!> <div class="component-add"><select></select> <select></select> <input type="number" min="1" max="1000"/> <button class="comp-add-btn">+</button></div></div> <div class="component-group svelte-1ookxvc"><div class="component-title svelte-1ookxvc">🚀 导弹</div> <!> <div class="component-add"><select></select> <select></select> <input type="number" min="1" max="500"/> <button class="comp-add-btn">+</button></div></div>',1),ui=(s,t,r)=>t(e(r).id),hi=y('<div class="component-item svelte-1ookxvc"><span> </span> <button class="remove-btn svelte-1ookxvc">✕</button></div>'),fi=y("<option> </option>"),pi=y("<option> </option>"),_i=(s,t,r)=>t(e(r).id),bi=y('<div class="component-item svelte-1ookxvc"><span> </span> <button class="remove-btn svelte-1ookxvc">✕</button></div>'),mi=y("<option> </option>"),gi=y("<option> </option>"),yi=(s,t,r)=>t(e(r).id),xi=y('<div class="component-item svelte-1ookxvc"><span> </span> <button class="remove-btn svelte-1ookxvc">✕</button></div>'),$i=y("<option> </option>"),wi=y("<option> </option>"),Si=y('<div class="component-group svelte-1ookxvc"><div class="component-title svelte-1ookxvc">🚢 水面舰艇</div> <!> <div class="component-add"><select></select> <select></select> <input type="number" min="1" max="20"/> <button class="comp-add-btn">+</button></div></div> <div class="component-group svelte-1ookxvc"><div class="component-title svelte-1ookxvc">🔱 潜艇</div> <!> <div class="component-add"><select></select> <select></select> <input type="number" min="1" max="15"/> <button class="comp-add-btn">+</button></div></div> <div class="component-group svelte-1ookxvc"><div class="component-title svelte-1ookxvc">⚓ 支援舰艇</div> <!> <div class="component-add"><select></select> <select></select> <input type="number" min="1" max="10"/> <button class="comp-add-btn">+</button></div></div>',1),Pi=(s,t,r)=>t(e(r).id),ki=y('<div class="component-item svelte-1ookxvc"><span> </span> <button class="remove-btn svelte-1ookxvc">✕</button></div>'),Ti=y("<option> </option>"),Ni=y("<option> </option>"),Ai=(s,t,r)=>t(e(r).id),Ci=y('<div class="component-item svelte-1ookxvc"><span> </span> <button class="remove-btn svelte-1ookxvc">✕</button></div>'),Ei=y("<option> </option>"),Li=y("<option> </option>"),Mi=(s,t,r)=>t(e(r).id),zi=y('<div class="component-item svelte-1ookxvc"><span> </span> <button class="remove-btn svelte-1ookxvc">✕</button></div>'),Oi=y("<option> </option>"),Ri=y("<option> </option>"),Bi=y('<div class="component-group svelte-1ookxvc"><div class="component-title svelte-1ookxvc">✈️ 战斗机</div> <!> <div class="component-add"><select></select> <select></select> <input type="number" min="1" max="50"/> <button class="comp-add-btn">+</button></div></div> <div class="component-group svelte-1ookxvc"><div class="component-title svelte-1ookxvc">💣 轰炸机</div> <!> <div class="component-add"><select></select> <select></select> <input type="number" min="1" max="20"/> <button class="comp-add-btn">+</button></div></div> <div class="component-group svelte-1ookxvc"><div class="component-title svelte-1ookxvc">📡 支援飞机</div> <!> <div class="component-add"><select></select> <select></select> <input type="number" min="1" max="15"/> <button class="comp-add-btn">+</button></div></div>',1),Vi=y('<div class="edit-panel"><div class="edit-header"> </div> <!></div>'),Di=y('<div class="branch-selector svelte-1ookxvc"></div> <div class="quick-create"><input type="text" placeholder="输入单位名称"/> <button class="quick-create-btn"><!> <span>创建</span></button></div> <div class="unit-list svelte-1ookxvc"><!> <!></div> <!>',1),Ii=y('<div class="panel-section svelte-1ookxvc"><div class="panel-title svelte-1ookxvc"><span class="icon svelte-1ookxvc">⚔️</span> <span>军事单位</span></div> <!></div>');function Ui(s,t){M(t,!0);const r=()=>$t(Xr,"$currentFaction",i),o=()=>$t(Do,"$currentFactionId",i),a=()=>$t(yo,"$currentBranch",i),[i,n]=ge(),l=["army","navy","air_force"];let u=T(null),f=T(""),_=T("light"),b=T("basic"),p=T(1e3),g=T("light_tank"),x=T("gen1"),S=T(50),N=T("anti_tank"),R=T("basic"),D=T(20),C=T("destroyer"),X=T("basic"),Q=T(2),nt=T("attack_sub"),Tt=T("basic"),wt=T(1),bt=T("amphibious"),kt=T("basic"),jt=T(1),ee=T("air_superiority"),Nt=T("gen4"),Rt=T(12),Bt=T("strategic"),At=T("basic"),Jt=T(4),Wt=T("awacs"),qt=T("basic"),ye=T(2);function it(){return crypto.randomUUID()}let gt=$(()=>!e(u)||!r()?null:r().units.find(Y=>Y.id===e(u))??null);function Vt(){const Y=e(f).trim();if(!Y||!o())return;const et=it();let Z;switch(a()){case"army":Z={id:et,name:Y,branch:"army",infantry:[],armor:[],missiles:[]};break;case"navy":Z={id:et,name:Y,branch:"navy",surface:[],submarines:[],support:[]};break;case"air_force":Z={id:et,name:Y,branch:"air_force",fighters:[],bombers:[],support:[]};break}Ms(o(),Z),m(u,et,!0),m(f,"")}function ut(Y){m(u,e(u)===Y?null:Y,!0)}function ft(Y){!o()||!e(u)||Te(o(),e(u),et=>{switch(et.branch){case"army":return{...et,infantry:et.infantry.filter(Z=>Z.id!==Y),armor:et.armor.filter(Z=>Z.id!==Y),missiles:et.missiles.filter(Z=>Z.id!==Y)};case"navy":return{...et,surface:et.surface.filter(Z=>Z.id!==Y),submarines:et.submarines.filter(Z=>Z.id!==Y),support:et.support.filter(Z=>Z.id!==Y)};case"air_force":return{...et,fighters:et.fighters.filter(Z=>Z.id!==Y),bombers:et.bombers.filter(Z=>Z.id!==Y),support:et.support.filter(Z=>Z.id!==Y)}}})}function re(Y){zs.set(Y),Os.set("place")}var Zt=Ii(),mt=h(v(Zt),2);{var Ct=Y=>{var et=Hn();d(Y,et)},_t=Y=>{var et=Di(),Z=P(et);G(Z,20,()=>l,at=>at,(at,dt)=>{var Pt=jn();let De;Pt.__click=()=>{yo.set(dt),m(u,null)};var Oe=v(Pt,!0);c(Pt),B(Ie=>{De=tr(Pt,1,"branch-btn svelte-1ookxvc",null,De,Ie),O(Oe,Oo[dt])},[()=>({active:a()===dt})]),d(at,Pt)}),c(Z);var ct=h(Z,2),ht=v(ct);we(ht),ht.__keydown=[Wn,Vt];var yt=h(ht,2);yt.__click=Vt;var Et=v(yt);Io(Et,{size:14}),Qt(2),c(yt),c(ct);var ne=h(ct,2),Xt=v(ne);G(Xt,1,()=>r().units.filter(at=>at.branch===a()),at=>at.id,(at,dt)=>{var Pt=Kn();let De;var Oe=v(Pt);Oe.__click=[qn,ut,dt],Oe.__keydown=[Xn,ut,dt];var Ie=v(Oe),ar=v(Ie);{var Re=Dt=>{Na(Dt,{size:14})},Be=Dt=>{Aa(Dt,{size:14})};K(ar,Dt=>{e(u)===e(dt).id?Dt(Re):Dt(Be,!1)})}var Ue=h(ar,2),Fe=v(Ue,!0);c(Ue),c(Ie);var Ye=h(Ie,2),te=v(Ye);te.__click=[Qn,re,dt];var oe=v(te);Ma(oe,{size:14}),c(te);var se=h(te,2);se.__click=[Gn,o,dt,u];var ve=v(se);Vo(ve,{size:14}),c(se),c(Ye),c(Oe),c(Pt),B(Dt=>{De=tr(Pt,1,"unit-item svelte-1ookxvc",null,De,Dt),O(Fe,e(dt).name)},[()=>({editing:e(u)===e(dt).id})]),d(at,Pt)});var St=h(Xt,2);{var Lt=at=>{var dt=Jn();d(at,dt)};K(St,at=>{r().units.filter(dt=>dt.branch===a()).length===0&&at(Lt)})}c(ne);var ie=h(ne,2);{var Ne=at=>{var dt=Vi(),Pt=v(dt),De=v(Pt);c(Pt);var Oe=h(Pt,2);{var Ie=Re=>{const Be=$(()=>e(gt));var Ue=vi(),Fe=P(Ue),Ye=h(v(Fe),2);G(Ye,17,()=>e(Be).infantry,I=>I.id,(I,lt)=>{var tt=ti(),rt=v(tt),xt=v(rt);c(rt);var w=h(rt,2);w.__click=[Zn,ft,lt],c(tt),B(()=>O(xt,`${Sr[e(lt).type]??""} · ${Pr[e(lt).quality]??""} × ${e(lt).count??""}`)),d(I,tt)});var te=h(Ye,2),oe=v(te);G(oe,21,()=>Object.entries(Sr),pt,(I,lt)=>{var tt=$(()=>Mt(e(lt),2));let rt=()=>e(tt)[0],xt=()=>e(tt)[1];var w=ei(),j=v(w,!0);c(w);var V={};B(()=>{O(j,xt()),V!==(V=rt())&&(w.value=(w.__value=rt())??"")}),d(I,w)}),c(oe);var se=h(oe,2);G(se,21,()=>Object.entries(Pr),pt,(I,lt)=>{var tt=$(()=>Mt(e(lt),2));let rt=()=>e(tt)[0],xt=()=>e(tt)[1];var w=ri(),j=v(w,!0);c(w);var V={};B(()=>{O(j,xt()),V!==(V=rt())&&(w.value=(w.__value=rt())??"")}),d(I,w)}),c(se);var ve=h(se,2);we(ve);var Dt=h(ve,2);Dt.__click=[On,o,u,it,_,b,p],c(te),c(Fe);var xe=h(Fe,2),$e=h(v(xe),2);G($e,17,()=>e(Be).armor,I=>I.id,(I,lt)=>{var tt=si(),rt=v(tt),xt=v(rt);c(rt);var w=h(rt,2);w.__click=[oi,ft,lt],c(tt),B(()=>O(xt,`${kr[e(lt).type]??""} · ${Tr[e(lt).quality]??""} × ${e(lt).count??""}`)),d(I,tt)});var ue=h($e,2),he=v(ue);G(he,21,()=>Object.entries(kr),pt,(I,lt)=>{var tt=$(()=>Mt(e(lt),2));let rt=()=>e(tt)[0],xt=()=>e(tt)[1];var w=ai(),j=v(w,!0);c(w);var V={};B(()=>{O(j,xt()),V!==(V=rt())&&(w.value=(w.__value=rt())??"")}),d(I,w)}),c(he);var Ae=h(he,2);G(Ae,21,()=>Object.entries(Tr),pt,(I,lt)=>{var tt=$(()=>Mt(e(lt),2));let rt=()=>e(tt)[0],xt=()=>e(tt)[1];var w=ni(),j=v(w,!0);c(w);var V={};B(()=>{O(j,xt()),V!==(V=rt())&&(w.value=(w.__value=rt())??"")}),d(I,w)}),c(Ae);var le=h(Ae,2);we(le);var Ce=h(le,2);Ce.__click=[Rn,o,u,it,g,x,S],c(ue),c(xe);var Ee=h(xe,2),Le=h(v(Ee),2);G(Le,17,()=>e(Be).missiles,I=>I.id,(I,lt)=>{var tt=li(),rt=v(tt),xt=v(rt);c(rt);var w=h(rt,2);w.__click=[ii,ft,lt],c(tt),B(()=>O(xt,`${Nr[e(lt).type]??""} · ${Ar[e(lt).quality]??""} × ${e(lt).count??""}`)),d(I,tt)});var fe=h(Le,2),pe=v(fe);G(pe,21,()=>Object.entries(Nr),pt,(I,lt)=>{var tt=$(()=>Mt(e(lt),2));let rt=()=>e(tt)[0],xt=()=>e(tt)[1];var w=ci(),j=v(w,!0);c(w);var V={};B(()=>{O(j,xt()),V!==(V=rt())&&(w.value=(w.__value=rt())??"")}),d(I,w)}),c(pe);var Me=h(pe,2);G(Me,21,()=>Object.entries(Ar),pt,(I,lt)=>{var tt=$(()=>Mt(e(lt),2));let rt=()=>e(tt)[0],xt=()=>e(tt)[1];var w=di(),j=v(w,!0);c(w);var V={};B(()=>{O(j,xt()),V!==(V=rt())&&(w.value=(w.__value=rt())??"")}),d(I,w)}),c(Me);var _e=h(Me,2);we(_e);var ze=h(_e,2);ze.__click=[Bn,o,u,it,N,R,D],c(fe),c(Ee),zt(oe,()=>e(_),I=>m(_,I)),zt(se,()=>e(b),I=>m(b,I)),ce(ve,()=>e(p),I=>m(p,I)),zt(he,()=>e(g),I=>m(g,I)),zt(Ae,()=>e(x),I=>m(x,I)),ce(le,()=>e(S),I=>m(S,I)),zt(pe,()=>e(N),I=>m(N,I)),zt(Me,()=>e(R),I=>m(R,I)),ce(_e,()=>e(D),I=>m(D,I)),d(Re,Ue)},ar=Re=>{var Be=E(),Ue=P(Be);{var Fe=te=>{const oe=$(()=>e(gt));var se=Si(),ve=P(se),Dt=h(v(ve),2);G(Dt,17,()=>e(oe).surface,w=>w.id,(w,j)=>{var V=hi(),vt=v(V),L=v(vt);c(vt);var k=h(vt,2);k.__click=[ui,ft,j],c(V),B(()=>O(L,`${Cr[e(j).type]??""} · ${Er[e(j).quality]??""} × ${e(j).count??""}`)),d(w,V)});var xe=h(Dt,2),$e=v(xe);G($e,21,()=>Object.entries(Cr),pt,(w,j)=>{var V=$(()=>Mt(e(j),2));let vt=()=>e(V)[0],L=()=>e(V)[1];var k=fi(),W=v(k,!0);c(k);var U={};B(()=>{O(W,L()),U!==(U=vt())&&(k.value=(k.__value=vt())??"")}),d(w,k)}),c($e);var ue=h($e,2);G(ue,21,()=>Object.entries(Er),pt,(w,j)=>{var V=$(()=>Mt(e(j),2));let vt=()=>e(V)[0],L=()=>e(V)[1];var k=pi(),W=v(k,!0);c(k);var U={};B(()=>{O(W,L()),U!==(U=vt())&&(k.value=(k.__value=vt())??"")}),d(w,k)}),c(ue);var he=h(ue,2);we(he);var Ae=h(he,2);Ae.__click=[Vn,o,u,it,C,X,Q],c(xe),c(ve);var le=h(ve,2),Ce=h(v(le),2);G(Ce,17,()=>e(oe).submarines,w=>w.id,(w,j)=>{var V=bi(),vt=v(V),L=v(vt);c(vt);var k=h(vt,2);k.__click=[_i,ft,j],c(V),B(()=>O(L,`${Lr[e(j).type]??""} · ${Mr[e(j).quality]??""} × ${e(j).count??""}`)),d(w,V)});var Ee=h(Ce,2),Le=v(Ee);G(Le,21,()=>Object.entries(Lr),pt,(w,j)=>{var V=$(()=>Mt(e(j),2));let vt=()=>e(V)[0],L=()=>e(V)[1];var k=mi(),W=v(k,!0);c(k);var U={};B(()=>{O(W,L()),U!==(U=vt())&&(k.value=(k.__value=vt())??"")}),d(w,k)}),c(Le);var fe=h(Le,2);G(fe,21,()=>Object.entries(Mr),pt,(w,j)=>{var V=$(()=>Mt(e(j),2));let vt=()=>e(V)[0],L=()=>e(V)[1];var k=gi(),W=v(k,!0);c(k);var U={};B(()=>{O(W,L()),U!==(U=vt())&&(k.value=(k.__value=vt())??"")}),d(w,k)}),c(fe);var pe=h(fe,2);we(pe);var Me=h(pe,2);Me.__click=[Dn,o,u,it,nt,Tt,wt],c(Ee),c(le);var _e=h(le,2),ze=h(v(_e),2);G(ze,17,()=>e(oe).support,w=>w.id,(w,j)=>{var V=xi(),vt=v(V),L=v(vt);c(vt);var k=h(vt,2);k.__click=[yi,ft,j],c(V),B(()=>O(L,`${zr[e(j).type]??""} · ${Or[e(j).quality]??""} × ${e(j).count??""}`)),d(w,V)});var I=h(ze,2),lt=v(I);G(lt,21,()=>Object.entries(zr),pt,(w,j)=>{var V=$(()=>Mt(e(j),2));let vt=()=>e(V)[0],L=()=>e(V)[1];var k=$i(),W=v(k,!0);c(k);var U={};B(()=>{O(W,L()),U!==(U=vt())&&(k.value=(k.__value=vt())??"")}),d(w,k)}),c(lt);var tt=h(lt,2);G(tt,21,()=>Object.entries(Or),pt,(w,j)=>{var V=$(()=>Mt(e(j),2));let vt=()=>e(V)[0],L=()=>e(V)[1];var k=wi(),W=v(k,!0);c(k);var U={};B(()=>{O(W,L()),U!==(U=vt())&&(k.value=(k.__value=vt())??"")}),d(w,k)}),c(tt);var rt=h(tt,2);we(rt);var xt=h(rt,2);xt.__click=[In,o,u,it,bt,kt,jt],c(I),c(_e),zt($e,()=>e(C),w=>m(C,w)),zt(ue,()=>e(X),w=>m(X,w)),ce(he,()=>e(Q),w=>m(Q,w)),zt(Le,()=>e(nt),w=>m(nt,w)),zt(fe,()=>e(Tt),w=>m(Tt,w)),ce(pe,()=>e(wt),w=>m(wt,w)),zt(lt,()=>e(bt),w=>m(bt,w)),zt(tt,()=>e(kt),w=>m(kt,w)),ce(rt,()=>e(jt),w=>m(jt,w)),d(te,se)},Ye=te=>{var oe=E(),se=P(oe);{var ve=Dt=>{const xe=$(()=>e(gt));var $e=Bi(),ue=P($e),he=h(v(ue),2);G(he,17,()=>e(xe).fighters,L=>L.id,(L,k)=>{var W=ki(),U=v(W),It=v(U);c(U);var q=h(U,2);q.__click=[Pi,ft,k],c(W),B(()=>O(It,`${Rr[e(k).type]??""} · ${Br[e(k).quality]??""} × ${e(k).count??""}`)),d(L,W)});var Ae=h(he,2),le=v(Ae);G(le,21,()=>Object.entries(Rr),pt,(L,k)=>{var W=$(()=>Mt(e(k),2));let U=()=>e(W)[0],It=()=>e(W)[1];var q=Ti(),be=v(q,!0);c(q);var Ut={};B(()=>{O(be,It()),Ut!==(Ut=U())&&(q.value=(q.__value=U())??"")}),d(L,q)}),c(le);var Ce=h(le,2);G(Ce,21,()=>Object.entries(Br),pt,(L,k)=>{var W=$(()=>Mt(e(k),2));let U=()=>e(W)[0],It=()=>e(W)[1];var q=Ni(),be=v(q,!0);c(q);var Ut={};B(()=>{O(be,It()),Ut!==(Ut=U())&&(q.value=(q.__value=U())??"")}),d(L,q)}),c(Ce);var Ee=h(Ce,2);we(Ee);var Le=h(Ee,2);Le.__click=[Un,o,u,it,ee,Nt,Rt],c(Ae),c(ue);var fe=h(ue,2),pe=h(v(fe),2);G(pe,17,()=>e(xe).bombers,L=>L.id,(L,k)=>{var W=Ci(),U=v(W),It=v(U);c(U);var q=h(U,2);q.__click=[Ai,ft,k],c(W),B(()=>O(It,`${Vr[e(k).type]??""} · ${Dr[e(k).quality]??""} × ${e(k).count??""}`)),d(L,W)});var Me=h(pe,2),_e=v(Me);G(_e,21,()=>Object.entries(Vr),pt,(L,k)=>{var W=$(()=>Mt(e(k),2));let U=()=>e(W)[0],It=()=>e(W)[1];var q=Ei(),be=v(q,!0);c(q);var Ut={};B(()=>{O(be,It()),Ut!==(Ut=U())&&(q.value=(q.__value=U())??"")}),d(L,q)}),c(_e);var ze=h(_e,2);G(ze,21,()=>Object.entries(Dr),pt,(L,k)=>{var W=$(()=>Mt(e(k),2));let U=()=>e(W)[0],It=()=>e(W)[1];var q=Li(),be=v(q,!0);c(q);var Ut={};B(()=>{O(be,It()),Ut!==(Ut=U())&&(q.value=(q.__value=U())??"")}),d(L,q)}),c(ze);var I=h(ze,2);we(I);var lt=h(I,2);lt.__click=[Fn,o,u,it,Bt,At,Jt],c(Me),c(fe);var tt=h(fe,2),rt=h(v(tt),2);G(rt,17,()=>e(xe).support,L=>L.id,(L,k)=>{var W=zi(),U=v(W),It=v(U);c(U);var q=h(U,2);q.__click=[Mi,ft,k],c(W),B(()=>O(It,`${Ir[e(k).type]??""} · ${Ur[e(k).quality]??""} × ${e(k).count??""}`)),d(L,W)});var xt=h(rt,2),w=v(xt);G(w,21,()=>Object.entries(Ir),pt,(L,k)=>{var W=$(()=>Mt(e(k),2));let U=()=>e(W)[0],It=()=>e(W)[1];var q=Oi(),be=v(q,!0);c(q);var Ut={};B(()=>{O(be,It()),Ut!==(Ut=U())&&(q.value=(q.__value=U())??"")}),d(L,q)}),c(w);var j=h(w,2);G(j,21,()=>Object.entries(Ur),pt,(L,k)=>{var W=$(()=>Mt(e(k),2));let U=()=>e(W)[0],It=()=>e(W)[1];var q=Ri(),be=v(q,!0);c(q);var Ut={};B(()=>{O(be,It()),Ut!==(Ut=U())&&(q.value=(q.__value=U())??"")}),d(L,q)}),c(j);var V=h(j,2);we(V);var vt=h(V,2);vt.__click=[Yn,o,u,it,Wt,qt,ye],c(xt),c(tt),zt(le,()=>e(ee),L=>m(ee,L)),zt(Ce,()=>e(Nt),L=>m(Nt,L)),ce(Ee,()=>e(Rt),L=>m(Rt,L)),zt(_e,()=>e(Bt),L=>m(Bt,L)),zt(ze,()=>e(At),L=>m(At,L)),ce(I,()=>e(Jt),L=>m(Jt,L)),zt(w,()=>e(Wt),L=>m(Wt,L)),zt(j,()=>e(qt),L=>m(qt,L)),ce(V,()=>e(ye),L=>m(ye,L)),d(Dt,$e)};K(se,Dt=>{e(gt).branch==="air_force"&&Dt(ve)},!0)}d(te,oe)};K(Ue,te=>{e(gt).branch==="navy"?te(Fe):te(Ye,!1)},!0)}d(Re,Be)};K(Oe,Re=>{e(gt).branch==="army"?Re(Ie):Re(ar,!1)})}c(dt),B(()=>O(De,`编辑: ${e(gt).name??""}`)),d(at,dt)};K(ie,at=>{e(gt)&&at(Ne)})}B(at=>yt.disabled=at,[()=>!e(f).trim()]),ce(ht,()=>e(f),at=>m(f,at)),d(Y,et)};K(mt,Y=>{r()?Y(_t,!1):Y(Ct)})}c(Zt),d(s,Zt),z(),n()}Co(["click","keydown"]);var Fi=y("<!> 阵营控制台",1),Yi=y("<!> <!>",1),Hi=y("<!> 新建阵营",1),ji=y("<!> 添加阵营",1),Wi=y("<!> 现有阵营",1),qi=y('<div class="rounded-lg border border-dashed px-3 py-8 text-center text-xs text-muted-foreground">暂无阵营，请先创建</div>'),Xi=y('<div class="space-y-2 pb-10"><!> <!></div>'),Qi=y("<!> <!>",1),Gi=y('<div class="flex h-full items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">请先创建或加载战局</div>'),Ki=y("<!> 行动记录",1),Ji=y('<p class="flex gap-2 border-b border-border/20 py-1 last:border-0"><span class="shrink-0 text-muted-foreground"> </span> <span> </span></p>'),Zi=y('<p class="py-2 text-center text-muted-foreground">等待操作...</p>'),tl=y('<div class="space-y-0.5 text-xs"><!></div>'),el=y('<div class="mt-auto border-t border-dashed pt-4"><!> <!></div>'),rl=y('<div class="mt-4 space-y-3"><div class="space-y-2"><!> <!></div> <!></div> <!> <!>',1),ol=y("<!> <!>",1),sl=y('<div class="sidebar-wrap absolute top-24 bottom-24 left-5 z-[1000] w-[22rem]"><!></div>'),al=y('<div class="absolute top-24 bottom-24 z-[999] w-[22rem] overflow-hidden rounded-xl border border-border/70 bg-background/75 shadow-xl backdrop-blur-md" style="left: calc(20px + 22rem + 12px)"><!></div>'),nl=y("<!> <!>",1);function il(s,t){M(t,!0);const r=()=>$t(Qo,"$leftBarPinned",i),o=()=>$t(Xr,"$currentFaction",i),a=()=>$t(qr,"$currentBattle",i),[i,n]=ge();function l(){return`hsl(${Math.floor(Math.random()*360)} 80% 55%)`}let u=T(""),f=T(We(l()));const _="new-faction-name";let b=T(We(r())),p=T(We(r()&&!!o()));Ft(()=>{if(r())m(b,!0);else{m(p,!1);const C=setTimeout(()=>{m(b,!1)},210);return()=>clearTimeout(C)}}),Ft(()=>{r()&&m(p,!!o())});function g(){const C=e(u).trim();C&&(Bs(C,e(f)),m(u,""),m(f,l(),!0))}var x=nl(),S=P(x);{var N=C=>{var X=sl(),Q=v(X);xn(Q,{class:"h-full gap-0 border-border/70 bg-background/75 py-0 shadow-xl backdrop-blur-md",children:(nt,Tt)=>{var wt=ol(),bt=P(wt);Tn(bt,{class:"border-b px-5 py-4",children:(jt,ee)=>{var Nt=Yi(),Rt=P(Nt);An(Rt,{class:"flex items-center gap-2 text-sm font-semibold tracking-wide",children:(At,Jt)=>{var Wt=Fi(),qt=P(Wt);Is(qt,{class:"h-4 w-4 text-red-500"}),Qt(),d(At,Wt)},$$slots:{default:!0}});var Bt=h(Rt,2);Pn(Bt,{class:"text-xs text-muted-foreground",children:(At,Jt)=>{Qt();var Wt=Ve("先选阵营，再进行单位部署");d(At,Wt)},$$slots:{default:!0}}),d(jt,Nt)},$$slots:{default:!0}});var kt=h(bt,2);wn(kt,{class:"sidebar-body px-5 py-4",children:(jt,ee)=>{var Nt=rl(),Rt=P(Nt),Bt=v(Rt),At=v(Bt);Je(At,{for:_,class:"flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase",children:(ut,ft)=>{var re=Hi(),Zt=P(re);Ca(Zt,{class:"h-3.5 w-3.5"}),Qt(),d(ut,re)},$$slots:{default:!0}});var Jt=h(At,2);gn(Jt,{id:_,type:"text",placeholder:"键入阵营名称",onkeydown:ut=>ut.key==="Enter"&&g(),get value(){return e(u)},set value(ut){m(u,ut,!0)}}),c(Bt);var Wt=h(Bt,2);{let ut=$(()=>!e(u).trim());Gt(Wt,{type:"button",class:"h-10 w-full",onclick:g,get disabled(){return e(ut)},children:(ft,re)=>{var Zt=ji(),mt=P(Zt);Io(mt,{class:"mr-1 h-4 w-4"}),Qt(),d(ft,Zt)},$$slots:{default:!0}})}c(Rt);var qt=h(Rt,2);{var ye=ut=>{var ft=Qi(),re=P(ft);Je(re,{class:"mt-6 flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase",children:(mt,Ct)=>{var _t=Wi(),Y=P(_t);La(Y,{class:"h-3.5 w-3.5"}),Qt(),d(mt,_t)},$$slots:{default:!0}});var Zt=h(re,2);Wr(Zt,{class:"faction-scroll h-[48%] border-t border-dashed pt-5 pr-2 ",children:(mt,Ct)=>{var _t=Xi(),Y=v(_t);G(Y,1,()=>a().factions,ct=>ct.id,(ct,ht)=>{zn(ct,{get faction(){return e(ht)}})});var et=h(Y,2);{var Z=ct=>{var ht=qi();d(ct,ht)};K(et,ct=>{a().factions.length===0&&ct(Z)})}c(_t),d(mt,_t)},$$slots:{default:!0}}),d(ut,ft)},it=ut=>{var ft=Gi();d(ut,ft)};K(qt,ut=>{a()?ut(ye):ut(it,!1)})}var gt=h(qt,2);{var Vt=ut=>{var ft=el(),re=v(ft);Je(re,{class:"mb-2 flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase",children:(mt,Ct)=>{var _t=Ki(),Y=P(_t);Ia(Y,{class:"h-3.5 w-3.5"}),Qt(),d(mt,_t)},$$slots:{default:!0}});var Zt=h(re,2);Wr(Zt,{class:"action-log-scroll h-32 rounded-md border border-dashed bg-muted/30 p-2",children:(mt,Ct)=>{var _t=tl(),Y=v(_t);{var et=ct=>{var ht=E(),yt=P(ht);G(yt,1,()=>a().actionLog,Et=>Et.id,(Et,ne)=>{var Xt=Ji(),St=v(Xt),Lt=v(St,!0);c(St);var ie=h(St,2),Ne=v(ie,!0);c(ie),c(Xt),B(at=>{O(Lt,at),O(Ne,e(ne).message)},[()=>new Date(e(ne).timestamp).toLocaleTimeString("zh-CN")]),d(Et,Xt)}),d(ct,ht)},Z=ct=>{var ht=Zi();d(ct,ht)};K(Y,ct=>{a().actionLog.length>0?ct(et):ct(Z,!1)})}c(_t),d(mt,_t)},$$slots:{default:!0}}),c(ft),d(ut,ft)};K(gt,ut=>{a()&&ut(Vt)})}d(jt,Nt)},$$slots:{default:!0}}),d(nt,wt)},$$slots:{default:!0}}),c(X),Ge(1,X,()=>To,()=>({x:-28,duration:260,easing:Po})),Ge(2,X,()=>jr,()=>({duration:220})),d(C,X)};K(S,C=>{e(b)&&C(N)})}var R=h(S,2);{var D=C=>{var X=al(),Q=v(X);Ui(Q,{}),c(X),Ge(1,X,()=>To,()=>({x:-20,duration:240,easing:Po})),Ge(2,X,()=>jr,()=>({duration:180})),d(C,X)};K(R,C=>{e(p)&&C(D)})}d(s,x),z(),n()}function ll(s,t){M(t,!0);let r=A(t,"ref",15,null),o=A(t,"value",15,""),a=F(t,["$$slots","$$events","$$legacy","ref","value","class"]);var i=E(),n=P(i);{let l=$(()=>Yt("flex flex-row gap-2",t.class));ae(n,()=>$a,(u,f)=>{f(u,st({"data-slot":"tabs",get class(){return e(l)}},()=>a,{get ref(){return r()},set ref(_){r(_)},get value(){return o()},set value(_){o(_)}}))})}d(s,i),z()}function cl(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","class"]);var a=E(),i=P(a);{let n=$(()=>Yt("blur-backdrop text-muted-foreground gap-3 flex flex-col h-fit w-fit rounded-lg p-2",t.class));ae(i,()=>Sa,(l,u)=>{u(l,st({"data-slot":"tabs-list",get class(){return e(n)}},()=>o,{get ref(){return r()},set ref(f){r(f)}}))})}d(s,a),z()}function dl(s,t){M(t,!0);let r=A(t,"ref",15,null),o=F(t,["$$slots","$$events","$$legacy","ref","class"]);var a=E(),i=P(a);{let n=$(()=>Yt("data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",t.class));ae(i,()=>ka,(l,u)=>{u(l,st({"data-slot":"tabs-trigger",get class(){return e(n)}},()=>o,{get ref(){return r()},set ref(f){r(f)}}))})}d(s,a),z()}var vl=y('<div class="font-bold"> </div> <div class="block text-xs whitespace-pre-wrap text-muted-foreground"> </div>',1),ul=y("<div><!> <!></div>");function $r(s,t){M(t,!1);let r=A(t,"title",8,""),o=A(t,"description",8,"");const a=Math.trunc(Math.random()*Number.MAX_SAFE_INTEGER).toString()+r();let i=A(t,"class",8,"");er();var n=ul(),l=v(n);Je(l,{get for(){return a},class:"space-1 block grow leading-[unset]",children:(f,_)=>{var b=vl(),p=P(b),g=v(p,!0);c(p);var x=h(p,2),S=v(x,!0);c(x),B(()=>{O(g,r()),O(S,o())}),d(f,b)},$$slots:{default:!0}});var u=h(l,2);Ys(u,t,"default",{get id(){return a}}),c(n),B(f=>tr(n,1,f),[()=>Eo((po(Yt),po(i()),He(()=>Yt("flex flex-col justify-between gap-3 rounded-lg px-6 py-4 md:flex-row md:items-center blur-setting-card",i()))))]),d(s,n),z()}const hl="/Veto/_app/immutable/assets/favicon.D6T98KLD.png";var fl=y('<div><div class="mt-6 pb-10 text-center lg:max-w-4xl "><div class="mb-4 flex justify-center gap-6 text-gray-600"><img alt="App Logo" class="h-64 w-64 rounded-md shadow-md"/></div></div> <div class="space-y-3 pb-10 lg:max-w-4xl "><div class="font-weight-bold text-xl font-bold">关于</div> <!> <!> <!></div> <div class="pb-6 text-center lg:max-w-4xl"><div class="text-base font-bold tracking-wide text-stone-700">MADE BY MIAOYWW</div> <div class="mt-2 text-sm text-stone-500"><div>Copyright Miaoyww 2025-2026.</div> <div>Distributed under the terms of the GPL-3.0 license.</div></div> <div class="mt-3 flex items-center justify-center gap-3"><a href="https://github.com/Miaoyww/Veto" target="_blank" rel="noreferrer" class="rounded-md border border-stone-300 px-3 py-1 text-sm text-stone-700 transition-colors hover:bg-stone-100">GitHub</a> <a href="https://space.bilibili.com/435970102" target="_blank" rel="noreferrer" class="rounded-md border border-stone-300 px-3 py-1 text-sm text-stone-700 transition-colors hover:bg-stone-100">Bilibili</a></div></div></div>');function pl(s){var t=fl(),r=v(t),o=v(r),a=v(o);c(o),c(r);var i=h(r,2),n=h(v(i),2);$r(n,{title:"版本号",children:gr,$$slots:{default:(f,_)=>{const b=yr(()=>_.id);Je(f,{get id(){return e(b)},children:(p,g)=>{Qt();var x=Ve();B(()=>O(x,`v${Us}`)),d(p,x)},$$slots:{default:!0}})}}});var l=h(n,2);$r(l,{title:"开源许可",children:gr,$$slots:{default:(f,_)=>{const b=yr(()=>_.id);Gt(f,{get id(){return e(b)},class:"w-24",variant:"outline",href:"https://github.com/Miaoyww/Veto/blob/master/LICENSE",children:(p,g)=>{Qt();var x=Ve("MIT");d(p,x)},$$slots:{default:!0}})}}});var u=h(l,2);$r(u,{title:"Github 仓库",children:gr,$$slots:{default:(f,_)=>{const b=yr(()=>_.id);Gt(f,{get id(){return e(b)},class:"w-24",variant:"outline",href:"https://github.com/Miaoyww/Veto",children:(p,g)=>{Qt();var x=Ve("Github");d(p,x)},$$slots:{default:!0}})}}}),c(i),Qt(2),c(t),B(()=>wr(a,"src",hl)),d(s,t)}var _l=y('<div class="setting-dialog absolute z-1000 flex items-center justify-center rounded-lg svelte-1dzc4jp"><!> <div class="blur-backdrop ml-6 flex h-200 w-240 flex-1 flex-col rounded-lg p-6"><!> <div><!></div></div></div>');function bl(s,t){M(t,!0);const r=()=>$t(cr,"$settingOpen",o),[o,a]=ge();let i=T("about");function n(_){m(i,_,!0)}var l=E(),u=P(l);{var f=_=>{var b=_l(),p=v(b);ae(p,()=>ll,(R,D)=>{D(R,{orientation:"vertical",class:"flex h-full",get value(){return e(i)},set value(C){m(i,C,!0)},children:(C,X)=>{var Q=E(),nt=P(Q);ae(nt,()=>cl,(Tt,wt)=>{wt(Tt,{class:"mb-4",children:(bt,kt)=>{var jt=E(),ee=P(jt);ae(ee,()=>dl,(Nt,Rt)=>{Rt(Nt,{value:"about",onclick:()=>n("about"),children:(Bt,At)=>{Qt();var Jt=Ve("关于");d(Bt,Jt)},$$slots:{default:!0}})}),d(bt,jt)},$$slots:{default:!0}})}),d(C,Q)},$$slots:{default:!0}})});var g=h(p,2),x=v(g);Gt(x,{variant:"ghost",size:"icon",class:"absolute top-4 right-4",onclick:()=>cr.set(!1),children:(R,D)=>{Xo(R,{})},$$slots:{default:!0}});var S=h(x,2),N=v(S);Wr(N,{class:"mt-5 h-180 w-full",scrollbarYClasses:"hidden",children:(R,D)=>{var C=E(),X=P(C);{var Q=nt=>{pl(nt)};K(X,nt=>{e(i)==="about"&&nt(Q)})}d(R,C)},$$slots:{default:!0}}),c(S),c(g),c(b),Ge(3,b,()=>jr,()=>({duration:150})),d(_,b)};K(u,_=>{r()&&_(f)})}d(s,l),z(),a()}var ml=y('<meta name="title" class="svelte-1y3i62d"/> <link rel="icon" type="image/x-icon" class="svelte-1y3i62d"/>',1),gl=y('<div class="svelte-1y3i62d"><div class="svelte-1y3i62d"><main class="svelte-1y3i62d"><!></main></div></div> <!> <!> <!> <!> <!> <!>',1);function Ol(s,t){var r=gl();us(g=>{var x=ml(),S=P(x),N=h(S,2);B(()=>{ds.title=bo,wr(S,"content",bo),wr(N,"href",Fs)}),d(g,x)});var o=P(r),a=v(o),i=v(a),n=v(i);H(n,()=>t.children??J),c(i),c(a),c(o);var l=h(o,2);il(l,{});var u=h(l,2);Xa(u,{});var f=h(u,2);fn(f,{});var _=h(f,2);Ya(_,{});var b=h(_,2);Ga(b,{});var p=h(b,2);bl(p,{}),d(s,r)}export{Ol as component};
