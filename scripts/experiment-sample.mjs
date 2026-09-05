const p=Number(process.argv[2]);
if(!(p>0&&p<1/1.2))throw Error('Pass the observed baseline useful-visit proportion, e.g. 0.15');
const target=p*1.2,pooled=(p+target)/2;
const n=Math.ceil((1.96*Math.sqrt(2*pooled*(1-pooled))+.8416*Math.sqrt(p*(1-p)+target*(1-target)))**2/(target-p)**2);
console.log(JSON.stringify({baseline:p,target,alpha:.05,power:.8,perArm:n,minDays:14,maxDaysBeforeQualitativeReview:28}));
