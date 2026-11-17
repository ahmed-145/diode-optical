export function capturePlan(width,height,{center=false,wide=false,maxSide=720}={}) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||!Number.isFinite(maxSide)||maxSide<64||maxSide>1440)throw new Error('Invalid capture geometry');
  const edge=Math.max(1,Math.floor(Math.min(width,height)*.9));
  const sourceWidth=wide?Math.max(1,Math.floor(Math.min(width*.9,height*1.8))):center?edge:width,sourceHeight=wide?Math.max(1,Math.floor(sourceWidth/2)):center?edge:height;
  const scale=Math.min(1,maxSide/Math.max(sourceWidth,sourceHeight));
  return {x:Math.floor((width-sourceWidth)/2),y:Math.floor((height-sourceHeight)/2),sourceWidth,sourceHeight,width:Math.max(1,Math.round(sourceWidth*scale)),height:Math.max(1,Math.round(sourceHeight*scale))};
}
