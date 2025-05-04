import { createSignal, Show } from "solid-js";
import { currencies, type Money } from "../routes";
import { Select } from "@kobalte/core/select";
import { ToggleButton } from "@kobalte/core/toggle-button";

export default function MoneyComponent(props: {
    money: Money;
    index: number;
    updateMoney: (money: Money, index: number) => void;
}) {
    const [selected, setSelected] = createSignal(true);
    return (
        <div
            class={`flex gap-2 items-center ${props.index % 2 === 0 ? "bg-gray-100" : ""} `}
        >
            <input
                class="size-5"
                type="checkbox"
                checked={selected()}
                onchange={() => setSelected(!selected())}
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
            <input type="number" value={props.money.amount} />
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
            >
                <Select.Trigger class="select__trigger" aria-label="Fruit">
                    <Select.Value class="select__value">
                        {(state) => state.selectedOption()}
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
        </div>
    );
}
