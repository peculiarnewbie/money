import { createFileRoute } from "@tanstack/solid-router";
import { createResource, createSignal, For, Show } from "solid-js";
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

type Collection = {
    id: string;
    moneys: Money[];
};

function getDataFromLocalStorage() {
    const local = localStorage.getItem("money");
    if (local) {
        // TODO: validate
        console.log(local);
        return JSON.parse(local);
    }

    const defaultCollection: Collection = {
        id: "default",
        moneys: [
            {
                name: "gaji",
                type: "income",
                amount: 35000000,
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
        ],
    };
    return [defaultCollection];
}

function Index() {
    const [data, setData] = createSignal<Collection[]>(
        getDataFromLocalStorage()
    );

    const [rates] = createResource<[string, number][]>(async () => {
        const res = await fetch(
            "https://api.frankfurter.dev/v1/latest?base=USD"
        );
        const json = await res.json();
        const fetchedRates = Object.entries(json.rates);
        fetchedRates.push(["USD", 1]);
        return fetchedRates.filter(([currency]) =>
            currencies.includes(currency as Currency)
        );
    });

    const moneys = () => data()[0].moneys;

    const remainingMoney = () => {
        const values = moneys().map((money) => {
            const idr = getIdrValue(money, rates());
            if (!money.selected) return 0;
            if (money.type === "income") return idr;
            return -idr;
        });
        return values.reduce((a, b) => a + b, 0);
    };

    const save = () => {
        localStorage.setItem("money", JSON.stringify(data()));
    };

    const updateMoney = (money: Money, index: number) => {
        console.log("updating money", money, index);
        const collection = data()[0];
        collection.moneys[index] = money;
        setData([collection]);
        save();
    };

    const deleteMoney = (index: number) => {
        const collection = data()[0];
        collection.moneys.splice(index, 1);
        setData([collection]);
        save();
    };

    const addMoney = () => {
        const collection = data()[0];
        collection.moneys.push({
            name: "example",
            type: "income",
            amount: 50000,
            currency: "IDR",
        });
        setData([collection]);
        save();
    };

    return (
        <div class="p-2 w-full flex flex-col gap-2">
            <h3>{data()[0].id}</h3>

            <div>rates:</div>
            <Show when={rates()}>
                <For each={rates()}>
                    {([currency, rate]) => (
                        <div>
                            {currency}: {rate}
                        </div>
                    )}
                </For>

                <For each={moneys()}>
                    {(money, index) => (
                        <MoneyComponent
                            money={money}
                            index={index()}
                            updateMoney={updateMoney}
                            deleteMoney={deleteMoney}
                            rates={rates()}
                        />
                    )}
                </For>
                <button
                    class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={addMoney}
                >
                    moar money
                </button>
            </Show>

            <div>remaining budget:</div>
            <div>Rp. {remainingMoney()}</div>
        </div>
    );
}
