import React from 'react';
import d3Cloud from 'd3-cloud';
import { BaseDatum, WordcloudConfig } from './types';
export interface WordcloudProps<Datum extends BaseDatum> extends WordcloudConfig<Datum> {
    children: (words: d3Cloud.Word[]) => React.ReactNode;
}
export default function Wordcloud<Datum extends BaseDatum>(props: WordcloudProps<Datum>): JSX.Element | null;
//# sourceMappingURL=Wordcloud.d.ts.map