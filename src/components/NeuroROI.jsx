import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Calculator, Settings, DollarSign, ChevronRight } from "lucide-react";
import { CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";

function StepHeader({ step, title, subtitle }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Step {step}</div>
                <div className="text-xl font-semibold tracking-tight">{title}</div>
                {subtitle ? <div className="text-sm text-slate-600 mt-1">{subtitle}</div> : null}
            </div>
        </div>
    );
}

function Field({ label, children, hint }) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
    );
}

function buildCsv(rows) {
    return rows
        .map((r) => r.map((v) => String(v)).join(","))
        .join("\n");
}

export default function NeuroROI() {
    const [params, setParams] = useState({
        newPatientsPerMonth: 10,
        testingRatePct: 100,

        neuroReadRatePct: 60,
        neuroReadsPerPatient: 1,
        neuroReadReimbursement: 1980,

        rtmEligiblePct: 100,
        rtmTotalPerPatientEpisode: 1705.51,

        includeG0552: true,
        g0552EligiblePct: 100,
        g0552ReimbursementOneTime: 7350,
        g0552Cost: 1000,

        doctorSharePct: 50,
        payerMixDiscountPct: 10,

        includeGrowth: true,
        monthlyGrowthPct: 5,

        avgMonthsMonitored: 6,
    });

    const [advanced, setAdvanced] = useState({
        usePerCodeBreakdown: false,
        cpt98975: 75,
        cpt98976: 55,
        cpt98980: 55,
        cpt98981: 45,
        visits98980PerMonth: 1,
        visits98981PerMonth: 1,
    });

    const payerFactor = useMemo(() => 1 - params.payerMixDiscountPct / 100, [params.payerMixDiscountPct]);
    const docShare = useMemo(() => params.doctorSharePct / 100, [params.doctorSharePct]);

    const rtmPerEpisode = useMemo(() => {
        if (!advanced.usePerCodeBreakdown) return params.rtmTotalPerPatientEpisode;

        const perMonth =
            advanced.cpt98976 +
            advanced.cpt98980 * advanced.visits98980PerMonth +
            advanced.cpt98981 * advanced.visits98981PerMonth;

        return advanced.cpt98975 + perMonth * params.avgMonthsMonitored;
    }, [advanced, params.avgMonthsMonitored, params.rtmTotalPerPatientEpisode]);

    const calc = useMemo(() => {
        const patientsPerYear = params.newPatientsPerMonth * 12;
        const testedPatientsPerYear = patientsPerYear * (params.testingRatePct / 100);

        const rtmPatientsPerYear = testedPatientsPerYear * (params.rtmEligiblePct / 100);
        const neuroReadCount =
            testedPatientsPerYear * (params.neuroReadRatePct / 100) * params.neuroReadsPerPatient;

        const grossRTM = rtmPatientsPerYear * rtmPerEpisode * payerFactor;
        const grossReads = neuroReadCount * params.neuroReadReimbursement * payerFactor;

        const g0552PatientsPerYear = testedPatientsPerYear * (params.g0552EligiblePct / 100);
        const grossG0552 = params.includeG0552
            ? g0552PatientsPerYear * params.g0552ReimbursementOneTime * payerFactor
            : 0;

        const grossTotal = grossRTM + grossReads + grossG0552;

        const doctorNet = grossTotal * docShare;
        const oneTimeCost = params.includeG0552 ? g0552PatientsPerYear * params.g0552Cost : 0;
        const doctorNetAfterCost = doctorNet - oneTimeCost;
        const monthlyNet = doctorNetAfterCost / 12;

        let monthlyAdds = params.newPatientsPerMonth;
        const data = [];

        for (let m = 1; m <= 12; m++) {
            const monthPatients = monthlyAdds;
            const testedMonthPatients = monthPatients * (params.testingRatePct / 100);

            const monthRtmPatients = testedMonthPatients * (params.rtmEligiblePct / 100);
            const monthReadCount =
                testedMonthPatients * (params.neuroReadRatePct / 100) * params.neuroReadsPerPatient;
            const monthG0552Patients = testedMonthPatients * (params.g0552EligiblePct / 100);

            const monthRTM = monthRtmPatients * rtmPerEpisode * payerFactor * docShare;
            const monthReads = monthReadCount * params.neuroReadReimbursement * payerFactor * docShare;
            const monthG0552 = params.includeG0552
                ? monthG0552Patients * params.g0552ReimbursementOneTime * payerFactor * docShare
                : 0;
            const monthCost = params.includeG0552 ? monthG0552Patients * params.g0552Cost : 0;

            data.push({
                month: `M${m}`,
                Net: monthRTM + monthReads + monthG0552 - monthCost,
                RTM: monthRTM,
                Reads: monthReads,
                G0552: monthG0552,
                Cost: -monthCost,
            });

            if (params.includeGrowth) {
                monthlyAdds = monthlyAdds * (1 + params.monthlyGrowthPct / 100);
            }
        }

        return {
            patientsPerYear,
            testedPatientsPerYear,
            rtmPatientsPerYear,
            neuroReadCount,
            grossRTM,
            grossReads,
            grossG0552,
            grossTotal,
            doctorNet,
            oneTimeCost,
            doctorNetAfterCost,
            monthlyNet,
            data,
        };
    }, [params, rtmPerEpisode, payerFactor, docShare]);

    const currency = (n) =>
        n.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        });

    const handleNumeric = (key) => (e) => {
        const v = Number(e.target.value || 0);
        setParams((p) => ({ ...p, [key]: v }));
    };

    const handleAdvancedNumeric = (key) => (e) => {
        const v = Number(e.target.value || 0);
        setAdvanced((a) => ({ ...a, [key]: v }));
    };

    const exportCSV = () => {
        const rows = [
            ["Month", "RTM (Net)", "Reads (Net)", "G0552 (Net)", "G0552 Cost (-)", "Total (Net)"],
            ...calc.data.map((d) => [
                d.month,
                d.RTM.toFixed(2),
                d.Reads.toFixed(2),
                d.G0552.toFixed(2),
                d.Cost.toFixed(2),
                d.Net.toFixed(2),
            ]),
        ];

        const csv = buildCsv(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "neuroglympse_roi_projection.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen p-6 md:p-10 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-5xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                            NeuroGlympse Care Model - Revenue Predictor
                        </h1>
                        <p className="text-slate-600 mt-2">
                            Start with new patients, apply a testing rate, then attach downstream services (Reads / RTM /
                            G0552) to the tested cohort.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={exportCSV} variant="secondary" className="rounded-2xl">
                            <Download className="mr-2 h-4 w-4" /> Export
                        </Button>
                    </div>
                </header>

                {/* STEP 1 */}
                <div>
                    <StepHeader
                        step={1}
                        title="Patient Intake"
                        subtitle="How many new patients enter the funnel, and what % receive testing?"
                    />
                    <Card className="mt-3">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" /> Intake Inputs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field label="New patients per month">
                                <Input
                                    type="number"
                                    value={params.newPatientsPerMonth}
                                    onChange={handleNumeric("newPatientsPerMonth")}
                                />
                            </Field>

                            <Field
                                label="Testing rate (% of new patients)"
                                hint="Downstream services (Reads / RTM / G0552) attach to the tested cohort."
                            >
                                <Input
                                    type="number"
                                    value={params.testingRatePct}
                                    onChange={handleNumeric("testingRatePct")}
                                />
                            </Field>

                            <div className="md:col-span-2 rounded-2xl border bg-white/60 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium">Optional growth</div>
                                        <div className="text-xs text-slate-500">
                                            Apply compound growth to new-patient adds month-over-month.
                                        </div>
                                    </div>
                                    <Switch
                                        checked={params.includeGrowth}
                                        onCheckedChange={(v) => setParams((p) => ({ ...p, includeGrowth: v }))}
                                    />
                                </div>

                                <div className={params.includeGrowth ? "mt-3" : "mt-3 opacity-50"}>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            className="w-28"
                                            type="number"
                                            value={params.monthlyGrowthPct}
                                            onChange={handleNumeric("monthlyGrowthPct")}
                                            disabled={!params.includeGrowth}
                                        />
                                        <span className="text-sm text-slate-600">% per month</span>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 rounded-2xl border bg-slate-50 p-4 flex items-center justify-between">
                                <div>
                                    <div className="text-xs text-slate-500">Computed</div>
                                    <div className="text-sm font-medium">Tested patients / year</div>
                                </div>
                                <div className="text-lg font-semibold">
                                    {Math.round(calc.testedPatientsPerYear).toLocaleString()}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* STEP 2 */}
                <div>
                    <div className="flex items-center gap-2 text-slate-400 mt-2">
                        <ChevronRight className="h-4 w-4" />
                    </div>
                    <StepHeader
                        step={2}
                        title="Services & Attach Rates"
                        subtitle="Of tested patients, what % receive each service?"
                    />
                    <Card className="mt-3">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calculator className="h-5 w-5" /> Service Inputs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Neuro Reads */}
                            <div className="rounded-2xl border bg-white/60 p-4">
                                <div className="text-sm font-semibold">Neuro Reads</div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                                    <Field label="Read rate (% of tested)">
                                        <Input
                                            type="number"
                                            value={params.neuroReadRatePct}
                                            onChange={handleNumeric("neuroReadRatePct")}
                                        />
                                    </Field>
                                    <Field label="Reads per patient">
                                        <Input
                                            type="number"
                                            value={params.neuroReadsPerPatient}
                                            onChange={handleNumeric("neuroReadsPerPatient")}
                                        />
                                    </Field>
                                    <Field label="Reimbursement per read ($)">
                                        <Input
                                            type="number"
                                            value={params.neuroReadReimbursement}
                                            onChange={handleNumeric("neuroReadReimbursement")}
                                        />
                                    </Field>
                                </div>
                                <div className="text-xs text-slate-500 mt-2">Counts are derived from tested patients only.</div>
                            </div>

                            {/* RTM */}
                            <div className="rounded-2xl border bg-white/60 p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="text-sm font-semibold">RTM</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Attach rate + episode value (simple) or CPT breakdown (advanced).
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Computed episode: <b className="text-slate-700">{currency(rtmPerEpisode)}</b>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    <Field label="RTM enrollment rate (% of tested)">
                                        <Input type="number" value={params.rtmEligiblePct} onChange={handleNumeric("rtmEligiblePct")} />
                                    </Field>
                                    <Field label="Avg months monitored per patient">
                                        <Input
                                            type="number"
                                            value={params.avgMonthsMonitored}
                                            onChange={handleNumeric("avgMonthsMonitored")}
                                        />
                                    </Field>
                                </div>

                                <details className="mt-4 rounded-xl border bg-slate-50 p-3">
                                    <summary className="cursor-pointer text-sm font-medium">RTM billing assumptions</summary>
                                    <div className="mt-3">
                                        <Tabs
                                            defaultValue="simple"
                                            onValueChange={(v) => setAdvanced((a) => ({ ...a, usePerCodeBreakdown: v === "advanced" }))}
                                        >
                                            <TabsList className="grid grid-cols-2">
                                                <TabsTrigger value="simple">Simple (Episode Total)</TabsTrigger>
                                                <TabsTrigger value="advanced">Advanced (Per Code)</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="simple" className="space-y-3">
                                                <Field
                                                    label="Total RTM revenue per patient episode ($)"
                                                    hint="Combined 98975/98976/98980/98981 total. Edit as needed."
                                                >
                                                    <Input
                                                        type="number"
                                                        value={params.rtmTotalPerPatientEpisode}
                                                        onChange={handleNumeric("rtmTotalPerPatientEpisode")}
                                                    />
                                                </Field>
                                            </TabsContent>
                                            <TabsContent value="advanced" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <Field label="98975 (init)">
                                                    <Input type="number" value={advanced.cpt98975} onChange={handleAdvancedNumeric("cpt98975")} />
                                                </Field>
                                                <Field label="98976 / mo">
                                                    <Input type="number" value={advanced.cpt98976} onChange={handleAdvancedNumeric("cpt98976")} />
                                                </Field>
                                                <Field label="98980 (per visit)">
                                                    <Input type="number" value={advanced.cpt98980} onChange={handleAdvancedNumeric("cpt98980")} />
                                                </Field>
                                                <Field label="98981 (additional per visit)">
                                                    <Input type="number" value={advanced.cpt98981} onChange={handleAdvancedNumeric("cpt98981")} />
                                                </Field>
                                                <Field label="# 98980 visits / mo">
                                                    <Input
                                                        type="number"
                                                        value={advanced.visits98980PerMonth}
                                                        onChange={handleAdvancedNumeric("visits98980PerMonth")}
                                                    />
                                                </Field>
                                                <Field label="# 98981 visits / mo">
                                                    <Input
                                                        type="number"
                                                        value={advanced.visits98981PerMonth}
                                                        onChange={handleAdvancedNumeric("visits98981PerMonth")}
                                                    />
                                                </Field>
                                                <div className="md:col-span-2 text-xs text-slate-500">
                                                    Episode total = 98975 + (98976 + 98980×visits + 98981×visits) × Avg months monitored
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                </details>
                            </div>

                            {/* G0552 */}
                            <div className="rounded-2xl border bg-white/60 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold">G0552 (one-time)</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Modeled as a one-time reimbursement and one-time deposit/cost per eligible tested patient.
                                        </div>
                                    </div>
                                    <Switch
                                        checked={params.includeG0552}
                                        onCheckedChange={(v) => setParams((p) => ({ ...p, includeG0552: v }))}
                                    />
                                </div>

                                <div
                                    className={
                                        params.includeG0552
                                            ? "grid grid-cols-1 md:grid-cols-4 gap-4 mt-3"
                                            : "grid grid-cols-1 md:grid-cols-4 gap-4 mt-3 opacity-50"
                                    }
                                >
                                    <Field label="Eligibility (% of tested)">
                                        <Input
                                            type="number"
                                            value={params.g0552EligiblePct}
                                            onChange={handleNumeric("g0552EligiblePct")}
                                            disabled={!params.includeG0552}
                                        />
                                    </Field>
                                    <Field label="Reimbursement ($)">
                                        <Input
                                            type="number"
                                            value={params.g0552ReimbursementOneTime}
                                            onChange={handleNumeric("g0552ReimbursementOneTime")}
                                            disabled={!params.includeG0552}
                                        />
                                    </Field>
                                    <Field label="Deposit/cost ($)">
                                        <Input
                                            type="number"
                                            value={params.g0552Cost}
                                            onChange={handleNumeric("g0552Cost")}
                                            disabled={!params.includeG0552}
                                        />
                                    </Field>
                                    <div className="rounded-xl border bg-slate-50 p-3">
                                        <div className="text-xs text-slate-500">Net per eligible</div>
                                        <div className="text-sm font-semibold">
                                            {params.includeG0552
                                                ? currency(params.g0552ReimbursementOneTime * payerFactor * docShare - params.g0552Cost)
                                                : "-"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue mechanics */}
                            <div className="rounded-2xl border bg-slate-50 p-4">
                                <div className="text-sm font-semibold">Revenue mechanics</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
                                    <div className="space-y-2">
                                        <Label>Payer mix haircut (%)</Label>
                                        <div className="flex items-center gap-3">
                                            <Slider
                                                value={[params.payerMixDiscountPct]}
                                                onValueChange={([v]) => setParams((p) => ({ ...p, payerMixDiscountPct: v }))}
                                                min={0}
                                                max={50}
                                                step={1}
                                            />
                                            <span className="w-12 text-right">{params.payerMixDiscountPct}%</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Partner share (%)</Label>
                                        <div className="flex items-center gap-3">
                                            <Slider
                                                value={[params.doctorSharePct]}
                                                onValueChange={([v]) => setParams((p) => ({ ...p, doctorSharePct: v }))}
                                                min={0}
                                                max={100}
                                                step={1}
                                            />
                                            <span className="w-12 text-right">{params.doctorSharePct}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* STEP 3 */}
                <div>
                    <div className="flex items-center gap-2 text-slate-400 mt-2">
                        <ChevronRight className="h-4 w-4" />
                    </div>
                    <StepHeader
                        step={3}
                        title="Financial Summary"
                        subtitle="What does the care model produce for the partner?"
                    />

                    <Card className="mt-3">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" /> Summary
                            </CardTitle>
                            <Button onClick={exportCSV} size="sm" className="rounded-2xl">
                                <Download className="mr-2 h-4 w-4" /> Export CSV
                            </Button>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="rounded-2xl border bg-white/60 p-4">
                                    <div className="text-slate-500 text-sm">Annual Gross (All)</div>
                                    <div className="text-2xl font-semibold">{currency(calc.grossTotal)}</div>
                                </div>

                                <div className="rounded-2xl border bg-white/60 p-4">
                                    <div className="text-slate-500 text-sm">Annual Partner Share (Net after G0552 cost)</div>
                                    <div className="text-2xl font-semibold">{currency(calc.doctorNetAfterCost)}</div>
                                </div>

                                <div className="rounded-2xl border bg-white/60 p-4">
                                    <div className="text-slate-500 text-sm">Monthly Partner Share (Avg)</div>
                                    <div className="text-2xl font-semibold">{currency(calc.monthlyNet)}</div>
                                </div>

                                <div className="rounded-2xl border bg-white/60 p-4">
                                    <div className="text-slate-500 text-sm">New vs Tested / Year</div>
                                    <div className="text-sm mt-2 flex items-center justify-between">
                                        <span className="text-slate-600">New</span>
                                        <span className="font-medium">{Math.round(calc.patientsPerYear).toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm flex items-center justify-between">
                                        <span className="text-slate-600">Tested</span>
                                        <span className="font-medium">{Math.round(calc.testedPatientsPerYear).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border bg-white/60 p-4 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">RTM Gross</span>
                                    <span className="font-medium">{currency(calc.grossRTM)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Neuro Reads Gross</span>
                                    <span className="font-medium">{currency(calc.grossReads)}</span>
                                </div>
                                {params.includeG0552 ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">G0552 Gross</span>
                                        <span className="font-medium">{currency(calc.grossG0552)}</span>
                                    </div>
                                ) : null}
                                {params.includeG0552 ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-600">G0552 Deposit/Cost (Expense)</span>
                                        <span className="font-medium">{currency(calc.oneTimeCost)}</span>
                                    </div>
                                ) : null}
                                <div className="flex items-center justify-between pt-2 border-t mt-2">
                                    <span className="text-slate-600">Total Gross</span>
                                    <span className="font-semibold">{currency(calc.grossTotal)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>12-Month Partner Share Projection</CardTitle>
                        </CardHeader>
                        <CardContent className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={calc.data}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(v) => currency(Number(v))} />
                                    <Legend />
                                    <Bar dataKey="RTM" stackId="a" name="RTM (Net)" fill="#6366f1" />
                                    <Bar dataKey="Reads" stackId="a" name="Neuro Reads (Net)" fill="#8b5cf6" />
                                    <Bar dataKey="G0552" stackId="a" name="G0552 (Net)" fill="#a855f7" />
                                    <Bar dataKey="Cost" stackId="a" name="G0552 Cost (-)" fill="#ef4444" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Assumptions</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-600 space-y-2">
                            <p>
                                • Funnel logic: Testing is applied to a % of new patients; Reads / RTM / G0552 are applied to the
                                tested cohort using their attach rates.
                            </p>
                            <p>
                                • "Payer mix haircut" conservatively reduces reimbursements to account for Medicare or lower-paying
                                plans.
                            </p>
                            <p>
                                • "Partner share" applies your split on gross revenue. In this model, the G0552 deposit/cost (if
                                enabled) is treated as an expense against partner share.
                            </p>
                            <p>
                                • RTM simple mode uses a single episode total. Advanced mode computes an episode total from code-level
                                inputs and your average months monitored.
                            </p>
                            <p>
                                • Monthly projection assumes new enrollments each month; when growth is enabled, new-patient adds
                                increase by the specified % each month.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
