import React from 'react';
export declare type PolygonProps = {
    /** Override render function which is provided polygon and generated path. */
    children?: ({ path, polygon }: {
        path: string;
        polygon: [number, number][];
    }) => React.ReactNode;
    /** className to apply to path element. */
    className?: string;
    /** Array of coordinate arrays for the polygon (e.g., [[x,y], [x1,y1], ...]), used to generate polygon path. */
    polygon?: [number, number][];
};
export default function Polygon({ polygon, className, children, ...restProps }: PolygonProps & Omit<React.SVGProps<SVGPathElement>, keyof PolygonProps>): JSX.Element | null;
//# sourceMappingURL=Polygon.d.ts.map