export const TOTAL_LOCI = 8;
export const SHIFT_K = 2;
// Genoma di default: scelto perché produce a tick=8 il codice PF8
// "010000" (riga 2, colonna 0 nella griglia PF8) — Femmina, Pelle
// scura, Capelli lisci, Occhi marroni, Lattosio non tollerante, Vista
// normale. Solo il locus L1 (regione genetica 2, allele A) è acceso;
// tutto il resto del genoma è a zero.
export const DEFAULT_GENOME_4X4 = [[0,0,0,0],[1,0,0,0],[0,0,0,0],[0,0,0,0]];
export const GENETIC_REGIONS = [
  "Regione genetica 1",
  "Regione genetica 2",
  "Regione genetica 3",
  "Regione genetica 4",
];

// Compatibilità con componenti precedenti: le righe del genoma non sono
// caratteri fenotipici diretti, ma regioni astratte contenenti due loci diploidi.
export const TRAITS = GENETIC_REGIONS;

export function locusDescriptor(index) {
  const safeIndex = Math.max(0, Math.min(TOTAL_LOCI - 1, Number(index) || 0));
  const block = safeIndex < 4 ? "A" : "B";
  const regionIndex = safeIndex % 4;
  return {
    index: safeIndex,
    label: `L${safeIndex}`,
    regionIndex,
    region: GENETIC_REGIONS[regionIndex],
    block,
    fullLabel: `${GENETIC_REGIONS[regionIndex]} · locus ${block}`,
  };
}
export const cloneMatrix = (matrix) => matrix.map((row) => [...row]);
export const toBit = (value) => Number(value) ? 1 : 0;
export function validateGenome4x4(genome) {
  if (!Array.isArray(genome) || genome.length !== 4 || genome.some((row) => !Array.isArray(row) || row.length !== 4)) throw new Error("Il genoma deve essere una matrice 4×4.");
}
export const resolveDominance = (a,b) => toBit(a) || toBit(b) ? 1 : 0;
export function resolveGenomeToLoci(genome) {
  validateGenome4x4(genome); const loci = Array(8).fill(0);
  for (let row=0; row<4; row++) { loci[row] = resolveDominance(genome[row][0], genome[row][1]); loci[row+4] = resolveDominance(genome[row][2], genome[row][3]); }
  return loci;
}
export const t4Partner = (index) => (index + SHIFT_K) % TOTAL_LOCI;
export const t4Address = (tick) => ({ row: tick % 4, col: Math.floor(tick / 4) });
export const emptyMemory4x4 = () => Array.from({length:4}, () => Array(4).fill(0));
export function memoryToMessageData(memory) { return Array.from({length:8}, (_,slot) => memory[slot%4][Math.floor(slot/4)]); }
export const messageDataToCode = (messageData) => messageData.slice(0,6).map(toBit).join("");
export function codeToPF8(code) { const safe = String(code).replace(/[^01]/g,"").padEnd(6,"0").slice(0,6); return {code:safe,rowBits:safe.slice(0,3),colBits:safe.slice(3,6),row:parseInt(safe.slice(0,3),2),col:parseInt(safe.slice(3,6),2)}; }
export function createInitialCell(genome=DEFAULT_GENOME_4X4) { validateGenome4x4(genome); return {id:"T4-CELL-001",phase:"initialized",tick:0,genome:cloneMatrix(genome),loci:resolveGenomeToLoci(genome),memory:emptyMemory4x4(),messageData:Array(8).fill(0),code:"000000",pf8:codeToPF8("000000"),history:[]}; }
export function runT4Tick(cell) {
  if (cell.tick >= 8) return {...cell, phase:"completed"};
  const tick=cell.tick, locusIndex=tick, partnerIndex=t4Partner(tick), locusValue=cell.loci[locusIndex], partnerValue=cell.loci[partnerIndex], writeValue=locusValue ^ partnerValue, address=t4Address(tick);
  const memory=cloneMatrix(cell.memory), previousValue=memory[address.row][address.col]; memory[address.row][address.col]=writeValue;
  const messageData=memoryToMessageData(memory), code=messageDataToCode(messageData), pf8=codeToPF8(code);
  const event={tick,locusIndex,partnerIndex,locusValue,partnerValue,writeValue,address,previousValue,memoryBefore:cloneMatrix(cell.memory),memoryAfter:cloneMatrix(memory)};
  return {...cell,phase:tick+1>=8?"completed":"developing",tick:tick+1,memory,messageData,code,pf8,history:[...cell.history,event]};
}
export function inspectT4Cell(cell) {
  const values=cell.memory.flat(), messageData=memoryToMessageData(cell.memory), code=messageDataToCode(messageData), pf8=codeToPF8(code), memoryMass=values.reduce((a,b)=>a+Number(b),0), occupiedCells=values.filter(Number).length, messageMass=messageData.reduce((a,b)=>a+Number(b),0), complete=cell.tick>=8&&cell.history.length===8, phenotypeReady=complete&&code.length===6, stable=complete&&phenotypeReady;
  const notes=[]; if(!complete) notes.push("development_incomplete"); if(occupiedCells===0) notes.push("empty_memory"); if(messageMass===0) notes.push("silent_message"); if(stable) notes.push("stable_t4_cell");
  return {status:stable?"stable":"unstable",stable,complete,memoryMass,occupiedCells,messageMass,phenotypeReady,code,pf8,notes};
}
export function cellAtTick(genome, targetTick) { let cell=createInitialCell(genome); while(cell.tick < Math.max(0,Math.min(8,targetTick))) cell=runT4Tick(cell); return {...cell,inspection:inspectT4Cell(cell)}; }
export function runCompleteT4Cell(genome=DEFAULT_GENOME_4X4) { return cellAtTick(genome,8); }
