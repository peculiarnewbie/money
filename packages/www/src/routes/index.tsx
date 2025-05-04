import { createFileRoute } from "@tanstack/solid-router";
import { createResource, createSignal, For } from "solid-js";
import MoneyComponent from "../components/money";

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
            },
            {
                name: "yt premium",
                type: "expense",
                amount: 50000,
                currency: "IDR",
            },
            {
                name: "t3-chat",
                type: "expense",
                amount: 8,
                currency: "USD",
            },
        ],
    };
    return [defaultCollection];
}

function Index() {
    const [data, setData] = createSignal<Collection[]>(
        getDataFromLocalStorage()
    );

    // const [rates] = createResource(async () => {
    //     const res = await fetch(
    //         "https://api.frankfurter.dev/v1/latest?base=USD"
    //     );
    //     const json = await res.json();
    //     return json.rates;
    // });

    console.log(data());

    const moneys = () => data()[0].moneys;

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

    return (
        <div class="p-2 w-full flex flex-col gap-2">
            <h3>{data()[0].id}</h3>

            <For each={moneys()}>
                {(money, index) => (
                    <MoneyComponent
                        money={money}
                        index={index()}
                        updateMoney={updateMoney}
                    />
                )}
            </For>
        </div>
    );
}
