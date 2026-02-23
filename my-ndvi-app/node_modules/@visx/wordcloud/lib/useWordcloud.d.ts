import d3Cloud from 'd3-cloud';
import { BaseDatum, WordcloudConfig } from './types';
export default function useWordcloud<Datum extends BaseDatum>({ width, height, font, fontSize, fontStyle, fontWeight, padding, random, rotate, spiral, words, }: WordcloudConfig<Datum>): d3Cloud.Word[];
//# sourceMappingURL=useWordcloud.d.ts.map