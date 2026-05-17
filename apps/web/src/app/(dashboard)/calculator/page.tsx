'use client';
import { useState, useEffect } from 'react';
import { Calculator, Home, IndianRupee, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const TABS = [
  { key: 'emi', label: 'EMI Calculator', icon: Calculator },
  { key: 'plot', label: 'Plot Price', icon: Home },
  { key: 'afford', label: 'Affordability', icon: TrendingUp },
];

function inr(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function Field({ label, value, onChange, placeholder, unit, min = 0 }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        {unit && <span className="absolute left-3 top-2 text-sm text-gray-400">{unit}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          className={cn('w-full border border-gray-200 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500', unit ? 'pl-7 pr-3' : 'px-3')}
        />
      </div>
    </div>
  );
}

function ResultCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-xl p-4', highlight ? 'bg-blue-600 text-white' : 'bg-gray-50')}>
      <p className={cn('text-xs font-medium mb-1', highlight ? 'text-blue-100' : 'text-gray-500')}>{label}</p>
      <p className={cn('text-xl font-bold', highlight ? 'text-white' : 'text-gray-900')}>{value}</p>
      {sub && <p className={cn('text-xs mt-0.5', highlight ? 'text-blue-200' : 'text-gray-400')}>{sub}</p>}
    </div>
  );
}

function EmiTab() {
  const [principal, setPrincipal] = useState('5000000');
  const [rate, setRate] = useState('8.5');
  const [tenure, setTenure] = useState('20');

  const P = +principal || 0;
  const r = (+rate || 0) / 12 / 100;
  const n = (+tenure || 0) * 12;

  const emi = r > 0 && n > 0 ? (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 0;
  const totalPayment = emi * n;
  const totalInterest = totalPayment - P;

  const amortization = [];
  let balance = P;
  for (let year = 1; year <= Math.min(+tenure, 5); year++) {
    let yearPrincipal = 0;
    let yearInterest = 0;
    for (let m = 0; m < 12; m++) {
      const intPart = balance * r;
      const prinPart = emi - intPart;
      yearInterest += intPart;
      yearPrincipal += prinPart;
      balance -= prinPart;
    }
    amortization.push({ year, principal: yearPrincipal, interest: yearInterest, balance: Math.max(0, balance) });
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900">Loan Details</h2>
        <Field label="Loan Amount" value={principal} onChange={setPrincipal} unit="₹" placeholder="5000000" />
        <Field label="Interest Rate (% per annum)" value={rate} onChange={setRate} placeholder="8.5" min={0} />
        <Field label="Loan Tenure (years)" value={tenure} onChange={setTenure} placeholder="20" min={1} />
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900">Result</h2>
        <ResultCard label="Monthly EMI" value={inr(emi)} highlight />
        <div className="grid grid-cols-2 gap-3">
          <ResultCard label="Total Interest" value={inr(totalInterest)} sub={`${((totalInterest / P) * 100).toFixed(0)}% of loan`} />
          <ResultCard label="Total Payment" value={inr(totalPayment)} />
        </div>

        {amortization.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-2 border-b">Amortization (first 5 years)</p>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['Year', 'Principal', 'Interest', 'Balance'].map(h => <th key={h} className="text-left px-3 py-2 text-gray-400 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {amortization.map(row => (
                  <tr key={row.year} className="border-t border-gray-50">
                    <td className="px-3 py-2 font-medium">{row.year}</td>
                    <td className="px-3 py-2 text-green-600">{inr(row.principal)}</td>
                    <td className="px-3 py-2 text-red-500">{inr(row.interest)}</td>
                    <td className="px-3 py-2 text-gray-600">{inr(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PlotTab() {
  const [area, setArea] = useState('200');
  const [unit, setUnit] = useState<'sqyd' | 'sqft'>('sqyd');
  const [pricePerSqft, setPricePerSqft] = useState('3500');

  const areaInSqft = unit === 'sqyd' ? +area * 9 : +area;
  const basePrice = areaInSqft * +pricePerSqft;
  const stampDuty = basePrice * 0.06;
  const registration = basePrice * 0.01;
  const total = basePrice + stampDuty + registration;

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900">Plot Details</h2>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Area Unit</label>
          <div className="flex gap-2">
            {[{ v: 'sqyd', l: 'Sq. Yards' }, { v: 'sqft', l: 'Sq. Feet' }].map(o => (
              <button key={o.v} onClick={() => setUnit(o.v as any)}
                className={cn('flex-1 py-2 text-sm rounded-lg border transition', unit === o.v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <Field label={`Area (${unit === 'sqyd' ? 'sq. yards' : 'sq. feet'})`} value={area} onChange={setArea} placeholder="200" />
        <Field label="Price per sq.ft (₹)" value={pricePerSqft} onChange={setPricePerSqft} unit="₹" placeholder="3500" />
        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">Note (Rajasthan)</p>
          <p>Stamp Duty: 6% | Registration: 1%</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900">Cost Breakdown</h2>
        <ResultCard label="Plot Base Price" value={inr(basePrice)} highlight />
        <div className="space-y-2">
          <ResultCard label={`Stamp Duty (6%) — ${(areaInSqft).toFixed(0)} sq.ft`} value={inr(stampDuty)} />
          <ResultCard label="Registration Fee (1%)" value={inr(registration)} />
          <div className="bg-green-600 text-white rounded-xl p-4">
            <p className="text-xs text-green-100 mb-1">Total Cost to Own</p>
            <p className="text-2xl font-bold">{inr(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AffordTab() {
  const [income, setIncome] = useState('100000');
  const [tenure, setTenure] = useState('20');
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    api.get('/inventory').then(r => setProjects(r.data || [])).catch(() => {});
  }, []);

  const monthlyEmi = +income * 0.4;
  const r = 8.5 / 12 / 100;
  const n = +tenure * 12;
  const maxLoan = r > 0 && n > 0 ? (monthlyEmi * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n)) : 0;
  const totalAffordable = maxLoan * 1.2;

  const affordable = projects.filter(p => p.pricePerSqft && +p.pricePerSqft * 100 <= totalAffordable);

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900">Your Profile</h2>
        <Field label="Monthly Income (₹)" value={income} onChange={setIncome} unit="₹" placeholder="100000" />
        <Field label="Preferred Tenure (years)" value={tenure} onChange={setTenure} placeholder="20" min={1} />
        <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
          <p className="font-semibold mb-1">How it's calculated</p>
          <p>Max EMI = 40% of monthly income ({inr(monthlyEmi)}/mo)</p>
          <p className="mt-1">At 8.5% interest, {tenure}-year tenure</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900">Affordability</h2>
        <ResultCard label="Max Home Loan" value={inr(maxLoan)} highlight />
        <ResultCard label="Total Property Budget" value={inr(totalAffordable)} sub="Loan + 20% down payment" />

        {affordable.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Matching Projects</p>
            <div className="space-y-2">
              {affordable.slice(0, 3).map(p => (
                <div key={p.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.location} · {p.available} available</p>
                  </div>
                  <p className="text-sm font-bold text-blue-600">₹{Number(p.pricePerSqft).toLocaleString('en-IN')}/sqft</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  const [tab, setTab] = useState('emi');

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Calculator size={20} className="text-blue-600" />
        <h1 className="text-lg font-bold text-gray-900">Real Estate Calculator</h1>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition', tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'emi' && <EmiTab />}
        {tab === 'plot' && <PlotTab />}
        {tab === 'afford' && <AffordTab />}
      </div>
    </div>
  );
}
