"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

type PermitType =
  | "HOT_WORK"
  | "CONFINED_SPACE"
  | "WORKING_AT_HEIGHT"
  | "ELECTRICAL_LOTO";

type Plant = {
  id: string;
  name: string;
  code: string;
};

type Area = {
  id: string;
  name: string;
  code: string;
  plantId: string;
};

type Equipment = {
  id: string;
  name: string;
  code: string;
  areaId: string;
};

type PermitForm = {
  contractorTeam: string;
  workDescription: string;
  plantId: string;
  areaId: string;
  equipmentId: string;
  plannedStart: string;
  plannedEnd: string;
  hazards: string;
  ppe: string;
  precautions: string;
  hotWorkType: string;
  fireWatchAssigned: boolean;
  fireExtinguisherType: string;
  combustiblesClearedRadius: string;
  lelPercent: string;
  oxygenPercent: string;
  gasTestTime: string;
  spaceId: string;
  entryPoint: string;
  confinedOxygenPercent: string;
  confinedLelPercent: string;
  h2sPpm: string;
  coPpm: string;
  atmosphericTestTime: string;
  standbyAttendant: string;
  rescuePlan: string;
  ventilationMethod: string;
  workHeightMeters: string;
  accessMethod: string;
  fallArrestEquipment: string;
  anchorPointVerified: boolean;
  barricadingBelow: boolean;
  weatherConditions: string;
  equipmentTag: string;
  voltageLevel: string;
  isolationPoints: string;
  lockNumbers: string;
  tagNumbers: string;
  earthingApplied: boolean;
  testedDeadBy: string;
  isolationMethod: string;
  lotoApplied: boolean;
  verificationMethod: string;
};

type PermitConflict = {
  permitId: string;
  permitNumber: string;
  type: PermitType;
  status: string;
  plannedStart: string;
  plannedEnd: string;
  workDescription: string;
  isHighRisk: boolean;
  reason: string;
};

const permitTypes: {
  value: PermitType;
  label: string;
  description: string;
}[] = [
  {
    value: "HOT_WORK",
    label: "Hot Work",
    description:
      "Welding, grinding, cutting or soldering activities.",
  },
  {
    value: "CONFINED_SPACE",
    label: "Confined Space",
    description:
      "Entry into tanks, pits, vessels or restricted spaces.",
  },
  {
    value: "WORKING_AT_HEIGHT",
    label: "Working at Height",
    description:
      "Work where a fall from height is a risk.",
  },
  {
    value: "ELECTRICAL_LOTO",
    label: "Electrical / LOTO",
    description:
      "Electrical isolation and lockout/tagout work.",
  },
];

export default function NewPermitPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [type, setType] =
    useState<PermitType>("HOT_WORK");

  const [plants, setPlants] = useState<Plant[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  const [form, setForm] = useState<PermitForm>({
    contractorTeam: "",
    workDescription: "",
    plantId: "",
    areaId: "",
    equipmentId: "",
    plannedStart: "",
    plannedEnd: "",
    hazards: "",
    ppe: "",
    precautions: "",

    hotWorkType: "WELDING",
    fireWatchAssigned: true,
    fireExtinguisherType: "CO2",
    combustiblesClearedRadius: "",
    lelPercent: "",
    oxygenPercent: "",
    gasTestTime: "",

    spaceId: "",
    entryPoint: "",
    confinedOxygenPercent: "",
    confinedLelPercent: "",
    h2sPpm: "",
    coPpm: "",
    atmosphericTestTime: "",
    standbyAttendant: "",
    rescuePlan: "",
    ventilationMethod: "Forced air ventilation",

    workHeightMeters: "",
    accessMethod: "SCAFFOLD",
    fallArrestEquipment: "",
    anchorPointVerified: false,
    barricadingBelow: false,
    weatherConditions: "",

    equipmentTag: "",
    voltageLevel: "",
    isolationPoints: "",
    lockNumbers: "",
    tagNumbers: "",
    earthingApplied: false,
    testedDeadBy: "",
    isolationMethod: "",
    lotoApplied: false,
    verificationMethod: "",
  });

  const [conflicts, setConflicts] = useState<PermitConflict[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflictCheckError, setConflictCheckError] = useState<string | null>(null);

  const selectedAreas = useMemo(() => {
    return areas.filter(
      (area) => area.plantId === form.plantId
    );
  }, [areas, form.plantId]);

  const selectedEquipment = useMemo(() => {
    return equipment.filter(
      (item) => item.areaId === form.areaId
    );
  }, [equipment, form.areaId]);

  useEffect(() => {
  const token = localStorage.getItem("ptw_token") ?? undefined;

  if (!token) {
    router.replace("/login");
    return;
  }

  async function loadOptions() {
    try {
      const response = await apiFetch<{
        options: {
          id: string;
          name: string;
          code: string;
          areas: {
            id: string;
            name: string;
            code: string;
            plantId: string;
            equipment: {
              id: string;
              name: string;
              code: string;
              areaId: string;
            }[];
          }[];
        }[];
      }>("/api/permits/options", {
        token,
      });

      const loadedPlants: Plant[] = response.options.map(
        (plant) => ({
          id: plant.id,
          name: plant.name,
          code: plant.code,
        })
      );

      const loadedAreas: Area[] = response.options.flatMap(
        (plant) =>
          plant.areas.map((area) => ({
            id: area.id,
            name: area.name,
            code: area.code,
            plantId: area.plantId,
          }))
      );

      const loadedEquipment: Equipment[] =
        response.options.flatMap((plant) =>
          plant.areas.flatMap((area) =>
            area.equipment.map((item) => ({
              id: item.id,
              name: item.name,
              code: item.code,
              areaId: item.areaId,
            }))
          )
        );

      setPlants(loadedPlants);
      setAreas(loadedAreas);
      setEquipment(loadedEquipment);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load plant and equipment data"
      );
    }
  }

  void loadOptions();
}, [router]);


  function updateField(
    field: keyof PermitForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function splitLines(value: string) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function checkPermitConflicts(): Promise<boolean> {
    const token = localStorage.getItem("ptw_token") ?? undefined;

    if (
      !token ||
      !form.plantId ||
      !form.areaId ||
      !form.plannedStart ||
      !form.plannedEnd
    ) {
      setConflicts([]);
      setConflictCheckError(null);
      return true;
    }

    try {
      setCheckingConflicts(true);
      setConflictCheckError(null);

      const params = new URLSearchParams({
        type,
        plantId: form.plantId,
        areaId: form.areaId,
        plannedStart: new Date(form.plannedStart).toISOString(),
        plannedEnd: new Date(form.plannedEnd).toISOString(),
      });

      if (form.equipmentId) {
        params.set("equipmentId", form.equipmentId);
      }

      const response = await apiFetch<{
        conflicts: PermitConflict[];
      }>(`/api/permits/conflicts?${params.toString()}`, {
        token,
      });

      setConflicts(response.conflicts);
      return true;
    } catch (error) {
      setConflicts([]);
      setConflictCheckError(
        error instanceof Error
          ? error.message
          : "Unable to check permit conflicts"
      );
      return false;
    } finally {
      setCheckingConflicts(false);
    }
  }

  async function nextStep() {
  if (step === 1) {
    if (!type) {
      alert("Please select a permit type.");
      return;
    }

    setStep(2);
    return;
  }

  if (step === 2) {
    if (!form.contractorTeam.trim()) {
      alert("Contractor / team is required.");
      return;
    }

    if (!form.workDescription.trim()) {
      alert("Work description is required.");
      return;
    }

    if (!form.plantId) {
      alert("Please select a plant.");
      return;
    }

    if (!form.areaId) {
      alert("Please select an area.");
      return;
    }

    if (!form.plannedStart) {
      alert("Planned start is required.");
      return;
    }

    if (!form.plannedEnd) {
      alert("Planned end is required.");
      return;
    }

    const start = new Date(form.plannedStart);
    const end = new Date(form.plannedEnd);

    if (Number.isNaN(start.getTime())) {
      alert("Please enter a valid planned start.");
      return;
    }

    if (Number.isNaN(end.getTime())) {
      alert("Please enter a valid planned end.");
      return;
    }

    if (end <= start) {
      alert("Planned end must be later than planned start.");
      return;
    }

    if (form.hazards.trim() === "") {
      alert("Please add at least one hazard.");
      return;
    }

    if (form.ppe.trim() === "") {
      alert("Please add the required PPE.");
      return;
    }

    if (form.precautions.trim() === "") {
      alert("Please add at least one precaution.");
      return;
    }

    setStep(3);
    return;
  }

  if (step === 3) {
    if (type === "HOT_WORK") {
      if (!form.hotWorkType) {
        alert("Hot work type is required.");
        return;
      }

      if (!form.fireExtinguisherType) {
        alert("Fire extinguisher type is required.");
        return;
      }
    }

    if (type === "CONFINED_SPACE") {
      if (!form.spaceId.trim()) {
        alert("Space ID is required.");
        return;
      }

      if (!form.entryPoint.trim()) {
        alert("Entry point is required.");
        return;
      }

      if (!form.standbyAttendant.trim()) {
        alert("Standby attendant is required.");
        return;
      }

      if (!form.rescuePlan.trim()) {
        alert("Rescue plan is required.");
        return;
      }

      if (!form.ventilationMethod.trim()) {
        alert("Ventilation method is required.");
        return;
      }
    }

    if (type === "WORKING_AT_HEIGHT") {
      const height = Number(form.workHeightMeters);

      if (!form.workHeightMeters || Number.isNaN(height)) {
        alert("A valid work height is required.");
        return;
      }

      if (height <= 0) {
        alert("Work height must be greater than 0.");
        return;
      }

      if (!form.accessMethod) {
        alert("Access method is required.");
        return;
      }

      if (!form.fallArrestEquipment.trim()) {
        alert("Fall arrest equipment is required.");
        return;
      }
    }

    if (type === "ELECTRICAL_LOTO") {
      if (!form.equipmentTag.trim()) {
        alert("Equipment tag is required.");
        return;
      }

      if (!form.voltageLevel.trim()) {
        alert("Voltage level is required.");
        return;
      }

      if (!form.isolationPoints.trim()) {
        alert("At least one isolation point is required.");
        return;
      }

      if (!form.lockNumbers.trim()) {
        alert("At least one lock number is required.");
        return;
      }

      if (!form.tagNumbers.trim()) {
        alert("At least one tag number is required.");
        return;
      }

      if (!form.testedDeadBy.trim()) {
        alert("Tested dead by is required.");
        return;
      }
    }

    const conflictCheckSucceeded = await checkPermitConflicts();

    if (!conflictCheckSucceeded) {
      alert("Conflict check could not be completed. Please try again.");
      return;
    }

    setStep(4);
    return;
  }
}

  function previousStep() {
    setStep((current) => Math.max(1, current - 1));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const token = localStorage.getItem("ptw_token") ?? undefined;

    if (!token) {
      router.replace("/login");
      return;
    }

    const payload: Record<string, unknown> = {
      type,
      plantId: form.plantId,
      areaId: form.areaId,
      equipmentId: form.equipmentId || undefined,
      contractorTeam: form.contractorTeam,
      workDescription: form.workDescription,
      plannedStart: new Date(
        form.plannedStart
      ).toISOString(),
      plannedEnd: new Date(
        form.plannedEnd
      ).toISOString(),
      hazards: splitLines(form.hazards),
      ppe: splitLines(form.ppe),
      precautions: splitLines(form.precautions),
    };

    if (type === "HOT_WORK") {
      payload.hotWorkDetails = {
        hotWorkType: form.hotWorkType,
        fireWatchAssigned: form.fireWatchAssigned,
        fireExtinguisherType:
          form.fireExtinguisherType,
        combustiblesClearedRadius:
          form.combustiblesClearedRadius
            ? Number(form.combustiblesClearedRadius)
            : undefined,
        lelPercent: form.lelPercent
          ? Number(form.lelPercent)
          : undefined,
        oxygenPercent: form.oxygenPercent
          ? Number(form.oxygenPercent)
          : undefined,
        gasTestTime: form.gasTestTime
          ? new Date(form.gasTestTime).toISOString()
          : undefined,
      };
    }

    if (type === "CONFINED_SPACE") {
      payload.confinedSpaceDetails = {
        spaceId: form.spaceId,
        entryPoint: form.entryPoint,
        oxygenPercent:
          form.confinedOxygenPercent
            ? Number(form.confinedOxygenPercent)
            : undefined,
        lelPercent:
          form.confinedLelPercent
            ? Number(form.confinedLelPercent)
            : undefined,
        h2sPpm: form.h2sPpm
          ? Number(form.h2sPpm)
          : undefined,
        coPpm: form.coPpm
          ? Number(form.coPpm)
          : undefined,
        atmosphericTestTime:
          form.atmosphericTestTime
            ? new Date(
                form.atmosphericTestTime
              ).toISOString()
            : undefined,
        standbyAttendant: form.standbyAttendant,
        rescuePlan: form.rescuePlan,
        ventilationMethod: form.ventilationMethod,
        entryExitLog: [],
      };
    }

    if (type === "WORKING_AT_HEIGHT") {
      payload.workingAtHeightDetails = {
        workHeightMeters: Number(
          form.workHeightMeters
        ),
        accessMethod: form.accessMethod,
        fallArrestEquipment:
          form.fallArrestEquipment,
        anchorPointVerified:
          form.anchorPointVerified,
        barricadingBelow:
          form.barricadingBelow,
        weatherConditions:
          form.weatherConditions || undefined,
      };
    }

    if (type === "ELECTRICAL_LOTO") {
      payload.electricalLotoDetails = {
        equipmentTag: form.equipmentTag,
        voltageLevel: form.voltageLevel,
        isolationPoints:
          splitLines(form.isolationPoints),
        lockNumbers:
          splitLines(form.lockNumbers),
        tagNumbers:
          splitLines(form.tagNumbers),
        earthingApplied: form.earthingApplied,
        testedDeadBy: form.testedDeadBy,
        isolationMethod:
          form.isolationMethod || undefined,
        lotoApplied: form.lotoApplied,
        verificationMethod:
          form.verificationMethod || undefined,
      };
    }
    setSubmitting(true);
    try {
      const response = await apiFetch<{
        permit: {
          id: string;
          permitNumber: string;
        };
      }>("/api/permits", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      });

      router.push(`/permits/${response.permit.id}`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create permit"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push("/")}
              className="mb-3 text-sm text-slate-500 hover:text-white"
            >
              ← Back to dashboard
            </button>

            <h1 className="text-3xl font-bold">
              Create Permit
            </h1>

            <p className="mt-2 text-slate-500">
              Create a work authorization with the required safety controls.
            </p>
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Step
            </p>
            <p className="text-xl font-bold">
              {step} / 4
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item}>
              <div
                className={`h-1 rounded-full ${
                  item <= step
                    ? "bg-emerald-500"
                    : "bg-slate-800"
                }`}
              />

              <p
                className={`mt-2 text-xs ${
                  item <= step
                    ? "text-emerald-400"
                    : "text-slate-600"
                }`}
              >
                {item === 1 && "Permit type"}
                {item === 2 && "Work details"}
                {item === 3 && "Safety controls"}
                {item === 4 && "Review"}
              </p>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:p-8"
        >
          {step === 1 && (
            <section>
              <div className="mb-6">
                <p className="text-sm text-emerald-400">
                  Step 1
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Select permit type
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose the type of hazardous work being performed.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {permitTypes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setType(item.value)
                    }
                    className={`rounded-2xl border p-5 text-left transition ${
                      type === item.value
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-950 hover:border-slate-600"
                    }`}
                  >
                    <p className="font-semibold">
                      {item.label}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div>
                <p className="text-sm text-emerald-400">
                  Step 2
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Work details & location
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Contractor / team"
                  value={form.contractorTeam}
                  onChange={(value) =>
                    updateField(
                      "contractorTeam",
                      value
                    )
                  }
                  required
                />

                <Field
                  label="Work description"
                  value={form.workDescription}
                  onChange={(value) =>
                    updateField(
                      "workDescription",
                      value
                    )
                  }
                  required
                  textarea
                />

                <SelectField
                    label="Plant"
                    value={form.plantId}
                    onChange={(value) => {
                        setForm((current) => ({
                        ...current,
                        plantId: value,
                        areaId: "",
                        equipmentId: "",
                        }));
                    }}
                    options={plants.map((plant) => ({
                        value: plant.id,
                        label: `${plant.name} (${plant.code})`,
                    }))}
                    placeholder="Select plant"
                    />

                <SelectField
                    label="Area"
                    value={form.areaId}
                    onChange={(value) => {
                        setForm((current) => ({
                        ...current,
                        areaId: value,
                        equipmentId: "",
                        }));
                    }}
                    options={selectedAreas.map((area) => ({
                        value: area.id,
                        label: `${area.name} (${area.code})`,
                    }))}
                    placeholder="Select area"
                    />

                <SelectField
                  label="Equipment"
                  value={form.equipmentId}
                  onChange={(value) =>
                    updateField(
                      "equipmentId",
                      value
                    )
                  }
                  options={selectedEquipment.map(
                    (item) => ({
                      value: item.id,
                      label: `${item.name} (${item.code})`,
                    })
                  )}
                  placeholder="Select equipment"
                />

                <Field
                  label="Planned start"
                  type="datetime-local"
                  value={form.plannedStart}
                  onChange={(value) =>
                    updateField(
                      "plannedStart",
                      value
                    )
                  }
                  required
                />

                <Field
                  label="Planned end"
                  type="datetime-local"
                  value={form.plannedEnd}
                  onChange={(value) =>
                    updateField(
                      "plannedEnd",
                      value
                    )
                  }
                  required
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <Field
                  label="Hazards"
                  value={form.hazards}
                  onChange={(value) =>
                    updateField(
                      "hazards",
                      value
                    )
                  }
                  placeholder="One per line"
                  textarea
                />

                <Field
                  label="PPE"
                  value={form.ppe}
                  onChange={(value) =>
                    updateField(
                      "ppe",
                      value
                    )
                  }
                  placeholder="One per line"
                  textarea
                />

                <Field
                  label="Precautions"
                  value={form.precautions}
                  onChange={(value) =>
                    updateField(
                      "precautions",
                      value
                    )
                  }
                  placeholder="One per line"
                  textarea
                />
              </div>
            </section>
          )}

          {step === 3 && (
            <SafetyFields
              type={type}
              form={form}
              updateField={updateField}
            />
          )}

          {step === 4 && (
            <ReviewStep
              type={type}
              form={form}
              conflicts={conflicts}
              checkingConflicts={checkingConflicts}
              conflictCheckError={conflictCheckError}
            />
          )}

          <div className="mt-8 flex justify-between border-t border-slate-800 pt-6">
            <button
              type="button"
              onClick={previousStep}
              disabled={step === 1}
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Back
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                {submitting ? "Creating..." : "Create Permit"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function SafetyFields({
  type,
  form,
  updateField,
}: {
  type: PermitType;
  form: PermitForm;
  updateField: (
    field: keyof PermitForm,
    value: string | boolean
  ) => void;
}) {
  if (type === "HOT_WORK") {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm text-emerald-400">
            Step 3
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Hot work controls
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            label="Hot work type"
            value={String(form.hotWorkType)}
            onChange={(value) =>
              updateField("hotWorkType", value)
            }
            options={[
              {
                value: "WELDING",
                label: "Welding",
              },
              {
                value: "GRINDING",
                label: "Grinding",
              },
              {
                value: "CUTTING",
                label: "Cutting",
              },
              {
                value: "SOLDERING",
                label: "Soldering",
              },
            ]}
          />

          <SelectField
            label="Fire extinguisher type"
            value={String(
              form.fireExtinguisherType
            )}
            onChange={(value) =>
              updateField(
                "fireExtinguisherType",
                value
              )
            }
            options={[
              {
                value: "CO2",
                label: "CO₂",
              },
              {
                value: "Dry Powder",
                label: "Dry Powder",
              },
              {
                value: "Foam",
                label: "Foam",
              },
            ]}
          />

          <Field
            label="Combustibles cleared radius (m)"
            type="number"
            value={String(
              form.combustiblesClearedRadius
            )}
            onChange={(value) =>
              updateField(
                "combustiblesClearedRadius",
                value
              )
            }
          />

          <Field
            label="LEL (%)"
            type="number"
            value={String(form.lelPercent)}
            onChange={(value) =>
              updateField("lelPercent", value)
            }
          />

          <Field
            label="O₂ (%)"
            type="number"
            value={String(
              form.oxygenPercent
            )}
            onChange={(value) =>
              updateField(
                "oxygenPercent",
                value
              )
            }
          />

          <Field
            label="Gas test time"
            type="datetime-local"
            value={String(
              form.gasTestTime
            )}
            onChange={(value) =>
              updateField(
                "gasTestTime",
                value
              )
            }
          />

          <BooleanField
            label="Fire watch assigned"
            checked={
              form.fireWatchAssigned === true
            }
            onChange={(value) =>
              updateField(
                "fireWatchAssigned",
                value
              )
            }
          />
        </div>
      </section>
    );
  }

  if (type === "CONFINED_SPACE") {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm text-emerald-400">
            Step 3
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Confined space controls
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Space ID"
            value={String(form.spaceId)}
            onChange={(value) =>
              updateField("spaceId", value)
            }
            required
          />

          <Field
            label="Entry point"
            value={String(
              form.entryPoint
            )}
            onChange={(value) =>
              updateField(
                "entryPoint",
                value
              )
            }
            required
          />

          <Field
            label="O₂ (%)"
            type="number"
            value={String(
              form.confinedOxygenPercent
            )}
            onChange={(value) =>
              updateField(
                "confinedOxygenPercent",
                value
              )
            }
          />

          <Field
            label="LEL (%)"
            type="number"
            value={String(
              form.confinedLelPercent
            )}
            onChange={(value) =>
              updateField(
                "confinedLelPercent",
                value
              )
            }
          />

          <Field
            label="H₂S (ppm)"
            type="number"
            value={String(form.h2sPpm)}
            onChange={(value) =>
              updateField(
                "h2sPpm",
                value
              )
            }
          />

          <Field
            label="CO (ppm)"
            type="number"
            value={String(form.coPpm)}
            onChange={(value) =>
              updateField(
                "coPpm",
                value
              )
            }
          />

          <Field
            label="Atmospheric test time"
            type="datetime-local"
            value={String(
              form.atmosphericTestTime
            )}
            onChange={(value) =>
              updateField(
                "atmosphericTestTime",
                value
              )
            }
          />

          <Field
            label="Standby attendant"
            value={String(
              form.standbyAttendant
            )}
            onChange={(value) =>
              updateField(
                "standbyAttendant",
                value
              )
            }
            required
          />

          <Field
            label="Rescue plan"
            value={String(
              form.rescuePlan
            )}
            onChange={(value) =>
              updateField(
                "rescuePlan",
                value
              )
            }
            textarea
            required
          />

          <Field
            label="Ventilation method"
            value={String(
              form.ventilationMethod
            )}
            onChange={(value) =>
              updateField(
                "ventilationMethod",
                value
              )
            }
            required
          />
        </div>
      </section>
    );
  }

  if (type === "WORKING_AT_HEIGHT") {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-sm text-emerald-400">
            Step 3
          </p>

          <h2 className="mt-1 text-xl font-semibold">
            Working at height controls
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Work height (m)"
            type="number"
            value={String(
              form.workHeightMeters
            )}
            onChange={(value) =>
              updateField(
                "workHeightMeters",
                value
              )
            }
            required
          />

          <SelectField
            label="Access method"
            value={String(
              form.accessMethod
            )}
            onChange={(value) =>
              updateField(
                "accessMethod",
                value
              )
            }
            options={[
              {
                value: "SCAFFOLD",
                label: "Scaffold",
              },
              {
                value: "LADDER",
                label: "Ladder",
              },
              {
                value: "MEWP",
                label: "MEWP",
              },
              {
                value: "ROPE",
                label: "Rope",
              },
            ]}
          />

          <Field
            label="Fall arrest equipment"
            value={String(
              form.fallArrestEquipment
            )}
            onChange={(value) =>
              updateField(
                "fallArrestEquipment",
                value
              )
            }
            required
          />

          <Field
            label="Weather conditions"
            value={String(
              form.weatherConditions
            )}
            onChange={(value) =>
              updateField(
                "weatherConditions",
                value
              )
            }
          />

          <BooleanField
            label="Anchor point checked"
            checked={
              form.anchorPointVerified === true
            }
            onChange={(value) =>
              updateField(
                "anchorPointVerified",
                value
              )
            }
          />

          <BooleanField
            label="Barricading below"
            checked={
              form.barricadingBelow === true
            }
            onChange={(value) =>
              updateField(
                "barricadingBelow",
                value
              )
            }
          />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm text-emerald-400">
          Step 3
        </p>

        <h2 className="mt-1 text-xl font-semibold">
          Electrical / LOTO controls
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Equipment tag"
          value={String(form.equipmentTag)}
          onChange={(value) =>
            updateField(
              "equipmentTag",
              value
            )
          }
          required
        />

        <Field
          label="Voltage"
          value={String(form.voltageLevel)}
          onChange={(value) =>
            updateField(
              "voltageLevel",
              value
            )
          }
          required
        />

        <Field
          label="Isolation points"
          value={String(
            form.isolationPoints
          )}
          onChange={(value) =>
            updateField(
              "isolationPoints",
              value
            )
          }
          placeholder="One per line"
          textarea
        />

        <Field
          label="Lock numbers"
          value={String(
            form.lockNumbers
          )}
          onChange={(value) =>
            updateField(
              "lockNumbers",
              value
            )
          }
          placeholder="One per line"
          textarea
        />

        <Field
          label="Tag numbers"
          value={String(
            form.tagNumbers
          )}
          onChange={(value) =>
            updateField(
              "tagNumbers",
              value
            )
          }
          placeholder="One per line"
          textarea
        />

        <Field
          label="Tested dead by"
          value={String(
            form.testedDeadBy
          )}
          onChange={(value) =>
            updateField(
              "testedDeadBy",
              value
            )
          }
          required
        />

        <Field
          label="Isolation method"
          value={String(
            form.isolationMethod
          )}
          onChange={(value) =>
            updateField(
              "isolationMethod",
              value
            )
          }
        />

        <Field
          label="Verification method"
          value={String(
            form.verificationMethod
          )}
          onChange={(value) =>
            updateField(
              "verificationMethod",
              value
            )
          }
        />

        <BooleanField
          label="Earthing applied"
          checked={
            form.earthingApplied === true
          }
          onChange={(value) =>
            updateField(
              "earthingApplied",
              value
            )
          }
        />

        <BooleanField
          label="LOTO applied"
          checked={
            form.lotoApplied === true
          }
          onChange={(value) =>
            updateField(
              "lotoApplied",
              value
            )
          }
        />
      </div>
    </section>
  );
}

function ReviewStep({
  type,
  form,
  conflicts,
  checkingConflicts,
  conflictCheckError,
}: {
  type: PermitType;
  form: PermitForm;
  conflicts: PermitConflict[];
  checkingConflicts: boolean;
  conflictCheckError: string | null;
}) {
  return (
    <section>
      <div className="mb-6">
        <p className="text-sm text-emerald-400">
          Step 4
        </p>

        <h2 className="mt-1 text-xl font-semibold">
          Review permit
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Check the details before creating the permit.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReviewItem
          label="Permit type"
          value={formatType(type)}
        />

        <ReviewItem
          label="Contractor / team"
          value={String(
            form.contractorTeam
          )}
        />

        <ReviewItem
          label="Work description"
          value={String(
            form.workDescription
          )}
        />

        <ReviewItem
          label="Planned start"
          value={String(
            form.plannedStart
          )}
        />

        <ReviewItem
          label="Planned end"
          value={String(
            form.plannedEnd
          )}
        />

        <ReviewItem
          label="Hazards"
          value={String(form.hazards)}
        />

        <ReviewItem
          label="PPE"
          value={String(form.ppe)}
        />

        <ReviewItem
          label="Precautions"
          value={String(
            form.precautions
          )}
        />
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-200">
              Permit conflict check
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Checking for overlapping work in the selected area and time window.
            </p>
          </div>
          {checkingConflicts && (
            <span className="shrink-0 text-xs text-slate-500">Checking…</span>
          )}
        </div>

        {conflictCheckError && (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-sm font-medium text-amber-400">
              Conflict check unavailable
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {conflictCheckError}
            </p>
          </div>
        )}

        {!checkingConflicts && !conflictCheckError && conflicts.length === 0 && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-sm font-medium text-emerald-400">
              No overlapping permits found
            </p>
            <p className="mt-1 text-sm text-slate-400">
              This permit does not overlap another active workflow permit in the same location and time window.
            </p>
          </div>
        )}

        {conflicts.length > 0 && (
          <div className="mt-4 space-y-3">
            {conflicts.map((conflict) => (
              <div
                key={conflict.permitId}
                className={`rounded-xl border p-4 ${
                  conflict.isHighRisk
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-amber-500/20 bg-amber-500/5"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      conflict.isHighRisk
                        ? "bg-red-500/10 text-red-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {conflict.isHighRisk ? "High-risk conflict" : "Overlap warning"}
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {conflict.permitNumber}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatType(conflict.type)} · {conflict.status}
                  </span>
                </div>

                <p className="mt-3 text-sm font-medium text-slate-200">
                  {conflict.reason}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {conflict.workDescription || "No work description"}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {new Date(conflict.plannedStart).toLocaleString()} → {new Date(conflict.plannedEnd).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm font-medium text-amber-400">
          After creation
        </p>

        <p className="mt-1 text-sm text-slate-400">
          The permit will start in DRAFT status and must be submitted before approvals can begin.
        </p>
      </div>
    </section>
  );
}

function ReviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm text-slate-200">
        {value || "—"}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  textarea = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      {textarea ? (
        <textarea
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          required={required}
          rows={4}
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-emerald-500"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-emerald-500"
        />
      )}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
      >
        <option value="">
          {placeholder || "Select..."}
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function BooleanField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="h-4 w-4 accent-emerald-500"
      />

      <span className="text-sm text-slate-300">
        {label}
      </span>
    </label>
  );
}

function formatType(type: string) {
  return type
    .split("_")
    .map(
      (part) =>
        part.charAt(0) +
        part.slice(1).toLowerCase()
    )
    .join(" ");
}