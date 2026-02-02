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
    selected?: boolean;
    onToggleSelected?: () => void;
    onConvertToMonthly?: () => void;
    onConvertToLedger?: () => void;
}) {
    const idrValue = () => getIdrValue(props.money, props.rates);
    const idrDisplay = () => `Rp. ${idrValue().toLocaleString()}`;
    const typeClass = () =>
        props.money.type === "income" ? "income" : "expense";
    const isSelected = () => props.selected ?? props.money.selected;
    const toggleSelected = () => {
        if (props.onToggleSelected) {
            props.onToggleSelected();
            return;
        }
        props.updateMoney(
            { ...props.money, selected: !props.money.selected },
            props.index
        );
    };
    const toggleType = () => {
        const newType = props.money.type === "income" ? "expense" : "income";
        props.updateMoney({ ...props.money, type: newType }, props.index);
    };
    const closeMenu = (event: MouseEvent) => {
        const details = (event.currentTarget as HTMLElement).closest(
            "details"
        ) as HTMLDetailsElement | null;
        details?.removeAttribute("open");
    };

    return (
        <div class={`ledger-row ${isSelected() ? "" : "is-muted"}`}>
            <div class="index tabular cell-index">{props.index + 1}</div>
            <input
                type="checkbox"
                class="cell-select"
                checked={isSelected()}
                onMouseDown={(e) => {
                    e.preventDefault();
                    toggleSelected();
                }}
                onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleSelected();
                    }
                }}
                onClick={(e) => e.preventDefault()}
            />
            <input
                type="text"
                value={props.money.name}
                class="cell-input cell-name"
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
                class="cell-input tabular amount cell-amount"
                onchange={(e) => {
                    const newAmount = e.currentTarget.value;
                    props.updateMoney(
                        { ...props.money, amount: Number(newAmount) },
                        props.index
                    );
                }}
            />
            <Select
                class="cell-currency"
                defaultValue={props.money.currency}
                options={Array.from(currencies)}
                itemComponent={(props) => (
                    <Select.Item item={props.item} class="select__item">
                        <Select.ItemLabel>{props.item.rawValue}</Select.ItemLabel>
                    </Select.Item>
                )}
                onChange={(value) => {
                    const newCurrency = value ?? "IDR";
                    props.updateMoney(
                        { ...props.money, currency: newCurrency },
                        props.index
                    );
                }}
            >
                <Select.Trigger class="select__trigger" aria-label="Currency">
                    <Select.Value>
                        {(state) => state.selectedOption() as Element}
                    </Select.Value>
                </Select.Trigger>
                <Select.Portal>
                    <Select.Content class="select__content">
                        <Select.Listbox class="select__listbox" />
                    </Select.Content>
                </Select.Portal>
            </Select>
            <ToggleButton
                pressed={props.money.type === "income"}
                class={`type-toggle cell-type ${typeClass()}`}
                onMouseDown={(e) => {
                    e.preventDefault();
                    toggleType();
                }}
                onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        toggleType();
                    }
                }}
            >
                {(state) => (state.pressed() ? "income" : "expense")}
            </ToggleButton>
            <div class={`tabular amount cell-idr ${typeClass()}`}>
                {idrDisplay()}
            </div>
            <div class="cell-actions">
                <details class="row-menu">
                    <summary class="row-menu-trigger" aria-label="Row actions">
                        ...
                    </summary>
                    <div class="row-menu-list">
                        {props.onConvertToMonthly ? (
                            <button
                                class="row-menu-item"
                                onClick={(event) => {
                                    props.onConvertToMonthly?.();
                                    closeMenu(event);
                                }}
                            >
                                to monthly
                            </button>
                        ) : null}
                        {props.onConvertToLedger ? (
                            <button
                                class="row-menu-item"
                                onClick={(event) => {
                                    props.onConvertToLedger?.();
                                    closeMenu(event);
                                }}
                            >
                                to ledger
                            </button>
                        ) : null}
                        <button
                            class="row-menu-item is-danger"
                            onClick={(event) => {
                                props.deleteMoney(props.index);
                                closeMenu(event);
                            }}
                        >
                            delete
                        </button>
                    </div>
                </details>
            </div>
        </div>
    );
}
