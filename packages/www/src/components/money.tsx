import { Show } from "solid-js";
import { currencies, type Money } from "../routes";
import { Select } from "@kobalte/core/select";
import { ToggleButton } from "@kobalte/core/toggle-button";

export const getIdrValue = (money: Money, rates: [string, number][]) => {
    if (!rates) return -1;
    switch (money.currency) {
        case "IDR":
            return money.amount;
        case "USD":
            return Math.floor(
                money.amount *
                    rates.find(([currency]) => currency === "IDR")![1]
            );
        case "JPY":
            return Math.floor(
                (money.amount *
                    rates.find(([currency]) => currency === "IDR")![1]) /
                    rates.find(([currency]) => currency === "JPY")![1]
            );
    }
};

export default function MoneyComponent(props: {
    money: Money;
    index: number;
    updateMoney: (money: Money, index: number) => void;
    deleteMoney: (index: number) => void;
    rates: [string, number][];
}) {
    const idrValue = () => getIdrValue(props.money, props.rates);

    return (
        <div
            class={`flex gap-2 items-center ${props.index % 2 === 0 ? "bg-gray-100" : ""} `}
        >
            <input
                class="size-5"
                type="checkbox"
                checked={props.money.selected}
                onchange={(e) => {
                    const newSelected = e.currentTarget.checked;
                    props.updateMoney(
                        { ...props.money, selected: newSelected },
                        props.index
                    );
                }}
            />
            <input
                type="text"
                value={props.money.name}
                onchange={(e) =>
                    props.updateMoney(
                        { ...props.money, name: e.currentTarget.value },
                        props.index
                    )
                }
            />
            <input
                type="number"
                value={props.money.amount}
                onchange={(e) => {
                    const newAmount = e.currentTarget.value;
                    props.updateMoney(
                        { ...props.money, amount: Number(newAmount) },
                        props.index
                    );
                }}
            />
            <Select
                defaultValue={props.money.currency}
                options={Array.from(currencies)}
                placeholder="select currency"
                class="border p-2"
                itemComponent={(props) => (
                    <Select.Item item={props.item} class="select__item">
                        <Select.ItemLabel>
                            {props.item.rawValue}
                        </Select.ItemLabel>
                        {/* <Select.ItemIndicator class="select__item-indicator">
                            <CheckIcon />
                        </Select.ItemIndicator> */}
                    </Select.Item>
                )}
                onChange={(value) => {
                    const newCurrency = value ?? "IDR";
                    console.log(newCurrency);
                    props.updateMoney(
                        { ...props.money, currency: newCurrency },
                        props.index
                    );
                }}
            >
                <Select.Trigger class="select__trigger" aria-label="Fruit">
                    <Select.Value class="select__value">
                        {(state) => state.selectedOption() as Element}
                    </Select.Value>
                    {/* <Select.Icon class="select__icon">
                        <CaretSortIcon />
                    </Select.Icon> */}
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content class="select__content bg-white">
                        <Select.Listbox class="select__listbox flex flex-col gap-1 p-2" />
                    </Select.Content>
                </Select.Portal>
            </Select>
            <ToggleButton
                pressed={props.money.type === "income"}
                class={`${
                    props.money.type === "income"
                        ? "bg-green-300"
                        : "bg-red-300"
                } p-2 rounded cursor-pointer`}
                onChange={() => {
                    const newType =
                        props.money.type === "income" ? "expense" : "income";
                    props.updateMoney(
                        { ...props.money, type: newType },
                        props.index
                    );
                }}
            >
                {(state) => (
                    <Show when={state.pressed()} fallback={<div>expense</div>}>
                        <div>income</div>
                    </Show>
                )}
            </ToggleButton>
            <div>Rp. {idrValue().toLocaleString()}</div>
            <button
                class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => props.deleteMoney(props.index)}
            >
                delete
            </button>
        </div>
    );
}
