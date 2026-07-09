export type Project = {
    id: string;
    name: string;
    type: string | null;
    location: string;
    city: string | null;
    totalUnits: number;
    available: number;
    pricePerSqft: number | null;
    priceMin: number | null;
    priceMax: number | null;
    reraNumber: string | null;
    description: string | null;
    amenities: string[];
    highlights: string[];
    images: string[];
    brochureUrl: string | null;
    videoUrl: string | null;
    possession: string | null;
    slug: string;
};

export type HighlightRow = { title: string; value: string };

export function formatPriceShort(val: number): string {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
}

export function getEmbedUrl(url: string): string {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

export function autoDescription(p: Project): string {
    const typeLabel =
        p.type === 'PLOT' ? 'residential plot' : p.type === 'APARTMENT' ? 'apartment' : p.type === 'VILLA' ? 'villa' : 'property';
    const city = p.city || 'the area';
    const priceNote = p.pricePerSqft ? ` at ₹${Number(p.pricePerSqft).toLocaleString('en-IN')} per sq. ft` : '';
    const possessionNote = p.possession ? ` with ${p.possession.toLowerCase()} possession` : '';

    return (
        `${p.name} is a premium ${typeLabel} development strategically located at ${p.location}${p.city ? ', ' + p.city : ''}. ` +
        `This meticulously planned community offers ${p.totalUnits} units${priceNote}${possessionNote}, ensuring a perfect blend of quality infrastructure and convenient living in ${city}.\n\n` +
        `With ${p.available} unit${p.available !== 1 ? 's' : ''} currently available, ${p.name} presents an exceptional investment opportunity. ` +
        `The project is designed to cater to families and investors seeking a well-connected, thoughtfully developed community.`
    );
}

export function computeHighlights(p: Project): HighlightRow[] {
    const rows: HighlightRow[] = [];

    if (p.type) {
        rows.push({
            title: 'Project Type',
            value: p.type === 'PLOT' ? 'Residential Plots' : p.type.charAt(0) + p.type.slice(1).toLowerCase(),
        });
    }

    rows.push({ title: 'Total Units', value: `${p.totalUnits} Units` });
    rows.push({ title: 'Available Units', value: `${p.available} Available` });

    if (p.pricePerSqft) rows.push({ title: 'Price per Sq. Ft', value: `₹${Number(p.pricePerSqft).toLocaleString('en-IN')}` });

    if (p.priceMin || p.priceMax) {
        const min = p.priceMin ? formatPriceShort(Number(p.priceMin)) : '';
        const max = p.priceMax ? formatPriceShort(Number(p.priceMax)) : '';
        rows.push({ title: 'Price Range', value: [min, max].filter(Boolean).join(' – ') });
    }

    if (p.possession) rows.push({ title: 'Possession', value: p.possession });
    if (p.reraNumber) rows.push({ title: 'RERA Approved', value: `Reg. No: ${p.reraNumber}` });
    if (p.city) rows.push({ title: 'Location', value: `${p.location}, ${p.city}` });

    return rows;
}

export function deriveHighlights(p: Project): { title: string; value: string }[] {
    return p.highlights.length > 0 ? p.highlights.map((h) => ({ title: '', value: h })) : computeHighlights(p);
}
