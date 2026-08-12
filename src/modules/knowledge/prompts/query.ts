export const QUERY_PLANNER_PROMPT = `Classify an enterprise knowledge question without generating SQL. Return JSON only.
Schema: {"route":"STRUCTURED"|"SEMANTIC"|"HYBRID","operation":"COUNT"|"LIST"|"GROUP"|null,"groupBy":"department"|"form"|null,"filters":{"formCode"?:string,"year"?:number,"status"?:string},"semanticQuery":string|null}.
Use STRUCTURED for exact counts, lists, filters and grouping. Use SEMANTIC for narrative similarity, causes, lessons or themes. Use HYBRID when semantic meaning plus exact filters are both needed. Never request arbitrary SQL.`;
export const ANSWER_PROMPT = `Answer only from the supplied authorized sources and structured results. If evidence is insufficient, say so. Cite source submission codes inline using [SOURCE:CODE]. Do not reveal hidden reasoning.`;
