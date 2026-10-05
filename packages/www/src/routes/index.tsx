import { createFileRoute } from "@tanstack/solid-router";
import {
    createResource,
    createSignal,
    For,
    Show,
} from "solid-js";
import MoneyComponent, { getIdrValue } from "../components/money";

export const Route = createFileRoute("/")({
    component: Index,
});

export const currencies = ["IDR", "USD", "JPY"] as const;

type Currency = (typeof currencies)[number];

export type Money = {
    name: string;
    type: "income" | "expense";
    amount: number;
    currency: Currency;
    selected: boolean;
};

type MonthlyItem = Money & {
    id: string;
};

type PerMonth = Record<string, Money[]>;

type MonthlyToggles = Record<string, Record<string, boolean>>;

const storageKeys = {
    perMonth: "money.perMonth",
    monthly: "money.monthly",
    monthlyToggles: "money.monthlyToggles",
};

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

const monthKeyPattern = /^(\d{4})-(\d{1,2})$/;

const shiftMonthKey = (value: string, delta: number) => {
    const match = monthKeyPattern.exec(value);
    if (!match) return currentMonthKey();
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return currentMonthKey();
    }
    if (month < 1 || month > 12) return currentMonthKey();
    let monthIndex = month - 1 + delta;
    const yearDelta = Math.floor(monthIndex / 12);
    monthIndex = ((monthIndex % 12) + 12) % 12;
    const nextYear = year + yearDelta;
    const nextMonth = String(monthIndex + 1).padStart(2, "0");
    return `${nextYear}-${nextMonth}`;
};

const pruneEmptyMonths = (value: PerMonth) => {
    const next: PerMonth = {};
    for (const [month, items] of Object.entries(value)) {
        if (Array.isArray(items) && items.length > 0) {
            next[month] = items;
        }
    }
    return next;
};

const readFromStorage = <T,>(key: string, fallback: T) => {
    const local = localStorage.getItem(key);
    if (!local) return fallback;
    try {
        return JSON.parse(local) as T;
    } catch {
        return fallback;
    }
};

const defaultMoneys: Money[] = [
    {
        name: "gaji",
        type: "income",
        amount: 3500000,
        currency: "IDR",
        selected: true,
    },
    {
        name: "yt premium",
        type: "expense",
        amount: 50000,
        currency: "IDR",
        selected: true,
    },
    {
        name: "t3-chat",
        type: "expense",
        amount: 8,
        currency: "USD",
        selected: true,
    },
];

function getPerMonthFromLocalStorage() {
    const perMonth = readFromStorage<PerMonth | null>(
        storageKeys.perMonth,
        null
    );
    if (perMonth && Object.keys(perMonth).length > 0) {
        const pruned = pruneEmptyMonths(perMonth);
        if (Object.keys(pruned).length !== Object.keys(perMonth).length) {
            localStorage.setItem(storageKeys.perMonth, JSON.stringify(pruned));
        }
        return pruned;
    }

    const legacy = localStorage.getItem("money");
    if (legacy) {
        try {
            const legacyData = JSON.parse(legacy) as { moneys?: Money[] }[];
            if (Array.isArray(legacyData) && legacyData[0]?.moneys) {
                const migrated = { [currentMonthKey()]: legacyData[0].moneys };
                localStorage.setItem(
                    storageKeys.perMonth,
                    JSON.stringify(migrated)
                );
                return migrated;
            }
        } catch {
            const fallback = { [currentMonthKey()]: defaultMoneys };
            localStorage.setItem(
                storageKeys.perMonth,
                JSON.stringify(fallback)
            );
            return fallback;
        }
    }
    const fallback = { [currentMonthKey()]: defaultMoneys };
    localStorage.setItem(storageKeys.perMonth, JSON.stringify(fallback));
    return fallback;
}

const getMonthlyItemsFromLocalStorage = () =>
    readFromStorage<MonthlyItem[]>(storageKeys.monthly, []);

const getMonthlyTogglesFromLocalStorage = () =>
    readFromStorage<MonthlyToggles>(storageKeys.monthlyToggles, {});

const newItemId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeMoney = (value: Partial<Money> | null | undefined): Money => {
    const currency = currencies.includes(value?.currency as Currency)
        ? (value?.currency as Currency)
        : "IDR";
    const type = value?.type === "income" ? "income" : "expense";
    const amount = Number.isFinite(value?.amount) ? Number(value?.amount) : 0;
    const name = typeof value?.name === "string" ? value.name : "item";
    const selected = value?.selected === undefined ? true : !!value.selected;
    return { name, type, amount, currency, selected };
};

const normalizeMonthlyItem = (
    value: Partial<MonthlyItem> | null | undefined
): MonthlyItem => ({
    ...normalizeMoney(value),
    id: typeof value?.id === "string" && value.id ? value.id : newItemId(),
});

function Index() {
    const [perMonth, setPerMonth] = createSignal<PerMonth>(
        getPerMonthFromLocalStorage()
    );
    const [monthlyItems, setMonthlyItems] = createSignal<MonthlyItem[]>(
        getMonthlyItemsFromLocalStorage()
    );
    const [monthlyToggles, setMonthlyToggles] =
        createSignal<MonthlyToggles>(getMonthlyTogglesFromLocalStorage());
    const [activeMonth, setActiveMonth] = createSignal(currentMonthKey());
    const [exporting, setExporting] = createSignal(false);
    let importInputRef: HTMLInputElement | undefined;

    const [rates] = createResource<[string, number][]>(async () => {
        const res = await fetch(
            "https://api.frankfurter.dev/v1/latest?base=USD"
        );
        const json = await res.json();
        const fetchedRates = Object.entries(
            json.rates as Record<string, number>
        );
        fetchedRates.push(["USD", 1]);
        return fetchedRates.filter(([currency]) =>
            currencies.includes(currency as Currency)
        );
    });

    const savePerMonth = (value: PerMonth) => {
        localStorage.setItem(storageKeys.perMonth, JSON.stringify(value));
    };

    const saveMonthlyItems = (value: MonthlyItem[]) => {
        localStorage.setItem(storageKeys.monthly, JSON.stringify(value));
    };

    const saveMonthlyToggles = (value: MonthlyToggles) => {
        localStorage.setItem(
            storageKeys.monthlyToggles,
            JSON.stringify(value)
        );
    };

    const goToPreviousMonth = () => {
        setActiveMonth(shiftMonthKey(activeMonth(), -1));
    };

    const goToNextMonth = () => {
        setActiveMonth(shiftMonthKey(activeMonth(), 1));
    };

    const deleteMonth = (month: string) => {
        const confirmed = window.confirm(
            `Delete all data for ${month}? This cannot be undone.`
        );
        if (!confirmed) return;
        const nextPerMonth = { ...perMonth() };
        if (month in nextPerMonth) {
            delete nextPerMonth[month];
        }
        savePerMonth(nextPerMonth);
        setPerMonth(nextPerMonth);
        setMonthlyToggles((prev) => {
            if (!(month in prev)) return prev;
            const { [month]: _removed, ...rest } = prev;
            saveMonthlyToggles(rest);
            return rest;
        });
        if (activeMonth() === month) {
            const remaining = Object.keys(nextPerMonth).sort().reverse();
            setActiveMonth(remaining[0] ?? currentMonthKey());
        }
    };

    const moneys = () => perMonth()[activeMonth()] ?? [];
    const isMonthlyEnabled = (id: string) =>
        monthlyToggles()[activeMonth()]?.[id] ?? true;
    const selectedCount = () =>
        moneys().filter((money) => money.selected).length +
        monthlyItems().filter((money) => isMonthlyEnabled(money.id)).length;
    const itemsCount = () => moneys().length + monthlyItems().length;

    const remainingMoney = () => {
        const currentRates = rates();
        if (!currentRates) return 0;
        const monthlyValues = monthlyItems().map((money) => {
            if (!isMonthlyEnabled(money.id)) return 0;
            const idr = getIdrValue(money, currentRates);
            return money.type === "income" ? idr : -idr;
        });
        const values = moneys().map((money) => {
            const idr = getIdrValue(money, currentRates);
            if (!money.selected) return 0;
            if (money.type === "income") return idr;
            return -idr;
        });
        return [...values, ...monthlyValues].reduce((a, b) => a + b, 0);
    };

    const monthlyTotal = () => {
        const currentRates = rates();
        if (!currentRates) return 0;
        const values = monthlyItems().map((money) => {
            if (!isMonthlyEnabled(money.id)) return 0;
            const idr = getIdrValue(money, currentRates);
            return money.type === "income" ? idr : -idr;
        });
        return values.reduce((a, b) => a + b, 0);
    };

    const updateMoney = (money: Money, index: number) => {
        setPerMonth((prev) => {
            const month = activeMonth();
            const nextMonth = [...(prev[month] ?? [])];
            nextMonth[index] = money;
            const next = { ...prev, [month]: nextMonth };
            savePerMonth(next);
            return next;
        });
    };

    const deleteMoney = (index: number) => {
        setPerMonth((prev) => {
            const month = activeMonth();
            const nextMonth = [...(prev[month] ?? [])];
            nextMonth.splice(index, 1);
            const next = { ...prev };
            if (nextMonth.length > 0) {
                next[month] = nextMonth;
            } else {
                delete next[month];
            }
            savePerMonth(next);
            return next;
        });
    };

    const addMoney = () => {
        setPerMonth((prev) => {
            const month = activeMonth();
            const nextMonth = [...(prev[month] ?? [])];
            nextMonth.push({
                name: "example",
                type: "income",
                amount: 50000,
                currency: "IDR",
                selected: true,
            });
            const next = { ...prev, [month]: nextMonth };
            savePerMonth(next);
            return next;
        });
    };

    const updateMonthlyItem = (money: Money, index: number) => {
        setMonthlyItems((prev) => {
            const next = [...prev];
            const currentId = prev[index]?.id ?? newItemId();
            next[index] = { ...money, id: currentId };
            saveMonthlyItems(next);
            return next;
        });
    };

    const removeMonthlyTogglesForId = (id: string) => {
        setMonthlyToggles((prev) => {
            const next: MonthlyToggles = {};
            for (const [month, toggles] of Object.entries(prev)) {
                if (!(id in toggles)) {
                    next[month] = toggles;
                    continue;
                }
                const { [id]: _removed, ...rest } = toggles;
                next[month] = rest;
            }
            saveMonthlyToggles(next);
            return next;
        });
    };

    const deleteMonthlyItem = (index: number) => {
        setMonthlyItems((prev) => {
            const next = [...prev];
            const removed = next[index];
            next.splice(index, 1);
            saveMonthlyItems(next);
            if (removed?.id) removeMonthlyTogglesForId(removed.id);
            return next;
        });
    };

    const addMonthlyItem = () => {
        setMonthlyItems((prev) => {
            const next = [...prev];
            next.push({
                id: newItemId(),
                name: "monthly item",
                type: "expense",
                amount: 50000,
                currency: "IDR",
                selected: true,
            });
            saveMonthlyItems(next);
            return next;
        });
    };

    const convertToMonthly = (index: number) => {
        const source = moneys()[index];
        if (!source) return;
        const month = activeMonth();
        setPerMonth((prev) => {
            const nextMonth = [...(prev[month] ?? [])];
            nextMonth.splice(index, 1);
            const next = { ...prev };
            if (nextMonth.length > 0) {
                next[month] = nextMonth;
            } else {
                delete next[month];
            }
            savePerMonth(next);
            return next;
        });
        setMonthlyItems((prev) => {
            const next = [...prev];
            next.push({
                ...source,
                id: newItemId(),
                selected: true,
            });
            saveMonthlyItems(next);
            return next;
        });
    };

    const convertToLedger = (index: number) => {
        const source = monthlyItems()[index];
        if (!source) return;
        const month = activeMonth();
        setMonthlyItems((prev) => {
            const next = [...prev];
            const removed = next[index];
            next.splice(index, 1);
            saveMonthlyItems(next);
            if (removed?.id) removeMonthlyTogglesForId(removed.id);
            return next;
        });
        setPerMonth((prev) => {
            const nextMonth = [...(prev[month] ?? [])];
            nextMonth.push({
                name: source.name,
                type: source.type,
                amount: source.amount,
                currency: source.currency,
                selected: true,
            });
            const next = { ...prev, [month]: nextMonth };
            savePerMonth(next);
            return next;
        });
    };

    const toggleMonthlyItem = (id: string) => {
        setMonthlyToggles((prev) => {
            const month = activeMonth();
            const monthToggles = { ...(prev[month] ?? {}) };
            const current = monthToggles[id];
            monthToggles[id] = current === undefined ? false : !current;
            const next = { ...prev, [month]: monthToggles };
            saveMonthlyToggles(next);
            return next;
        });
    };

    const remainingClass = () =>
        remainingMoney() >= 0 ? "income" : "expense";
    const monthlyTotalClass = () =>
        monthlyTotal() >= 0 ? "income" : "expense";
    const monthOptions = () => Object.keys(perMonth()).sort().reverse();
    const hasActiveMonth = () =>
        Object.prototype.hasOwnProperty.call(perMonth(), activeMonth());
    const exportData = () => ({
        perMonth: perMonth(),
        monthly: monthlyItems(),
        monthlyToggles: monthlyToggles(),
    });

    const exportJson = () => {
        const payload = JSON.stringify(exportData(), null, 2);
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const stamp = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `money-export-${stamp}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const openImport = () => {
        importInputRef?.click();
    };

    const applyImportedData = (data: {
        perMonth?: unknown;
        monthly?: unknown;
        monthlyToggles?: unknown;
    }) => {
        const nextPerMonth: PerMonth = {};
        if (data.perMonth && typeof data.perMonth === "object") {
            for (const [month, items] of Object.entries(data.perMonth)) {
                if (!Array.isArray(items) || items.length === 0) continue;
                nextPerMonth[month] = items.map((item) =>
                    normalizeMoney(item as Partial<Money>)
                );
            }
        }
        const nextMonthly = Array.isArray(data.monthly)
            ? data.monthly.map((item) =>
                  normalizeMonthlyItem(item as Partial<MonthlyItem>)
              )
            : [];
        const nextMonthlyToggles: MonthlyToggles =
            data.monthlyToggles && typeof data.monthlyToggles === "object"
                ? (data.monthlyToggles as MonthlyToggles)
                : {};
        setPerMonth(nextPerMonth);
        setMonthlyItems(nextMonthly);
        setMonthlyToggles(nextMonthlyToggles);
        savePerMonth(nextPerMonth);
        saveMonthlyItems(nextMonthly);
        saveMonthlyToggles(nextMonthlyToggles);
        const months = Object.keys(nextPerMonth).sort().reverse();
        setActiveMonth(months[0] ?? currentMonthKey());
    };

    const importJson = async (file: File) => {
        const confirmed = window.confirm(
            "Import will overwrite current local data. Continue?"
        );
        if (!confirmed) return;
        const text = await file.text();
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch {
            window.alert("Invalid JSON file.");
            return;
        }
        if (!parsed || typeof parsed !== "object") {
            window.alert("Invalid data format.");
            return;
        }
        applyImportedData(parsed as {
            perMonth?: unknown;
            monthly?: unknown;
            monthlyToggles?: unknown;
        });
    };

    return (
        <div class="app">
            <header class="topbar">
                <div class="brand">
                    <div class="app-title">money</div>
                    <div class="meta">local only</div>
                </div>
                <div class="top-actions">
                    <div class="meta tabular">
                        items: {itemsCount()} | selected: {selectedCount()}
                    </div>
                    <button
                        class="btn btn-compact"
                        onMouseDown={goToPreviousMonth}
                        onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                goToPreviousMonth();
                            }
                        }}
                        aria-label="Previous month"
                    >
                        prev
                    </button>
                    <button
                        class="btn btn-compact"
                        onMouseDown={goToNextMonth}
                        onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                goToNextMonth();
                            }
                        }}
                        aria-label="Next month"
                    >
                        next
                    </button>
                    <select
                        class="month-select"
                        aria-label="Month"
                        value={activeMonth()}
                        onChange={(event) =>
                            setActiveMonth(event.currentTarget.value)
                        }
                    >
                        <Show when={!hasActiveMonth()}>
                            <option value={activeMonth()} hidden>
                                {activeMonth()} (empty)
                            </option>
                        </Show>
                        <For each={monthOptions()}>
                            {(month) => (
                                <option value={month}>{month}</option>
                            )}
                        </For>
                    </select>
                    <button
                        class="btn btn-danger"
                        onMouseDown={() => deleteMonth(activeMonth())}
                        onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                deleteMonth(activeMonth());
                            }
                        }}
                    >
                        delete month
                    </button>
                    <button
                        class="btn btn-primary"
                        onMouseDown={addMoney}
                        onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                addMoney();
                            }
                        }}
                    >
                        add line
                    </button>
                </div>
            </header>

            <div class="page">
                <div class="main-column">
                    <section class="panel">
                        <div class="panel-header">
                            <div class="panel-title">monthly items</div>
                            <div class="panel-actions">
                                <div
                                    class={`tabular ${monthlyTotalClass()}`}
                                >
                                    Rp. {monthlyTotal().toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div class="panel-body">
                            <Show
                                when={rates()}
                                fallback={
                                    <div class="ledger-row ledger-empty">
                                        loading rates...
                                    </div>
                                }
                            >
                                <For each={monthlyItems()}>
                                {(money, index) => (
                                    <MoneyComponent
                                        money={money}
                                        index={index()}
                                        updateMoney={updateMonthlyItem}
                                        deleteMoney={deleteMonthlyItem}
                                        rates={rates() ?? []}
                                        selected={isMonthlyEnabled(money.id)}
                                        onToggleSelected={() =>
                                            toggleMonthlyItem(money.id)
                                        }
                                        onConvertToLedger={() =>
                                            convertToLedger(index())
                                        }
                                    />
                                )}
                            </For>
                        </Show>
                            <div class="panel-actions">
                                <button
                                    class="btn btn-quiet"
                                    onMouseDown={addMonthlyItem}
                                    onKeyDown={(e) => {
                                        if (e.key === " " || e.key === "Enter") {
                                            e.preventDefault();
                                            addMonthlyItem();
                                        }
                                    }}
                                >
                                    add monthly
                                </button>
                            </div>
                        </div>
                    </section>

                    <section class="panel">
                        <div class="panel-header">
                            <div class="panel-title">ledger</div>
                            <div class="panel-actions">
                                <div class={`tabular ${remainingClass()}`}>
                                    Rp. {remainingMoney().toLocaleString()}
                                </div>
                            </div>
                        </div>
                        <div class="panel-body">
                            <Show
                                when={rates()}
                                fallback={
                                    <div class="ledger-row ledger-empty">
                                        loading rates...
                                    </div>
                                }
                            >
                                <For each={moneys()}>
                                {(money, index) => (
                                    <MoneyComponent
                                        money={money}
                                        index={index()}
                                        updateMoney={updateMoney}
                                        deleteMoney={deleteMoney}
                                        rates={rates() ?? []}
                                        onConvertToMonthly={() =>
                                            convertToMonthly(index())
                                        }
                                    />
                                )}
                            </For>
                        </Show>
                            <div class="panel-actions">
                                <button
                                    class="btn btn-quiet"
                                    onMouseDown={addMoney}
                                    onKeyDown={(e) => {
                                        if (e.key === " " || e.key === "Enter") {
                                            e.preventDefault();
                                            addMoney();
                                        }
                                    }}
                                >
                                    add line
                                </button>
                            </div>
                        </div>
                    </section>
                </div>

                <aside class="panel">
                    <div class="panel-header">
                        <div class="panel-title">summary</div>
                        <div class="panel-actions">
                            <button
                                class="btn btn-quiet"
                                onMouseDown={() =>
                                    setExporting((value) => !value)
                                }
                                onKeyDown={(e) => {
                                    if (e.key === " " || e.key === "Enter") {
                                        e.preventDefault();
                                        setExporting((value) => !value);
                                    }
                                }}
                            >
                                {exporting() ? "hide json" : "show json"}
                            </button>
                            <button
                                class="btn btn-quiet"
                                onMouseDown={exportJson}
                                onKeyDown={(e) => {
                                    if (e.key === " " || e.key === "Enter") {
                                        e.preventDefault();
                                        exportJson();
                                    }
                                }}
                            >
                                export json
                            </button>
                            <button
                                class="btn btn-quiet"
                                onMouseDown={openImport}
                                onKeyDown={(e) => {
                                    if (e.key === " " || e.key === "Enter") {
                                        e.preventDefault();
                                        openImport();
                                    }
                                }}
                            >
                                import json
                            </button>
                            <input
                                ref={(el) => (importInputRef = el)}
                                type="file"
                                accept="application/json"
                                class="visually-hidden"
                                onChange={(event) => {
                                    const file = event.currentTarget.files?.[0];
                                    if (!file) return;
                                    void importJson(file);
                                    event.currentTarget.value = "";
                                }}
                            />
                        </div>
                    </div>
                    <div class="panel-body">
                        <div class="metric-block">
                            <div class="label">remaining budget (idr)</div>
                            <div class={`value tabular ${remainingClass()}`}>
                                Rp. {remainingMoney().toLocaleString()}
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">rates (usd base)</div>
                            <Show
                                when={rates()}
                                fallback={
                                    <div class="meta">loading rates...</div>
                                }
                            >
                                <div class="rates-grid">
                                    <For each={rates()}>
                                        {([currency, rate]) => (
                                            <div class="rate-row tabular">
                                                <div class="code">{currency}</div>
                                                <div>{rate}</div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>

                        <Show when={exporting()}>
                            <pre class="export-box">
                                {JSON.stringify(exportData(), null, 2)}
                            </pre>
                        </Show>
                        <div class="note">
                            stored in local storage only. export if you need
                            backups.
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
