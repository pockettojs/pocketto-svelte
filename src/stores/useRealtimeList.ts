import { onDestroy, onMount } from 'svelte';
import { writable } from 'svelte/store';
import { onDocChange, QueryBuilder } from 'pocketto';
import type { ModelStatic } from 'pocketto/dist/src/definitions/Model';
import { BaseModel } from 'pocketto';

export function useRealtimeList<T extends BaseModel>(type: ModelStatic<T>, config: {
    condition?: (query: QueryBuilder<T>) => QueryBuilder<T>;
    onItemChange?: (value: T | undefined) => void;
    onItemCreate?: (value: T | undefined) => void;
    onItemUpdate?: (value: T | undefined) => void;
    animationDelay?: number;
    order?: "asc" | "desc";
    orderBy?: keyof T;
    disableAutoAppend?: boolean;
} = {}) {
    const {
        condition = (query) => query.orderBy('createdAt', 'desc'),
        onItemChange,
        onItemCreate,
        onItemUpdate,
        animationDelay,
        order,
        orderBy,
        disableAutoAppend,
    } = config;
    const data = writable([] as T[]);

    const fetch = async (builder: (query: QueryBuilder<T>) => QueryBuilder<T>) => {
        const query = builder(new type().getClass().query() as unknown as QueryBuilder<T>);
        const docs = await query.get() as Array<T>;
        data.set(docs);
    };

    onMount(async () => {
        fetch(condition || ((query) => query));
    });

    const changedDoc = writable<T | undefined>();
    const docChange = async (id: string) => {
        if (!(data instanceof Array)) return;
        const doc = await new type().getClass().query().find(id) as T;
        const sameModelType = new type().getClass().collectionName === doc?.cName;
        if (!sameModelType) return;
        changedDoc.set(doc);
    };
    const event = onDocChange(docChange);

    changedDoc.subscribe((doc) => {
        if (doc) {
            data.update((currentData) => {
                const sameIdIndex = currentData.findIndex((i) => i.id === doc.id);
                if (sameIdIndex !== -1) {
                    currentData[sameIdIndex] = doc;
                    onItemUpdate?.(doc);
                    setTimeout(() => onItemUpdate?.(undefined), animationDelay || 1);
                } else if (!disableAutoAppend) {
                    if (!order || order === "desc") {
                        currentData.unshift(doc as T);
                    } else if (order === "asc") {
                        currentData.push(doc as T);
                    }

                    const sortBy = orderBy || 'createdAt';
                    currentData.sort((a, b) => {
                        if (a[sortBy] > b[sortBy]) {
                            return order === "asc" ? 1 : -1;
                        }
                        if (a[sortBy] < b[sortBy]) {
                            return order === "asc" ? -1 : 1;
                        }
                        return 0;
                    });

                    onItemCreate?.(doc);
                    setTimeout(() => onItemCreate?.(undefined), animationDelay || 1);
                }
                onItemChange?.(doc);
                setTimeout(() => onItemChange?.(undefined), animationDelay || 1);
                return currentData;
            });
        }
    });

    onDestroy(() => {
        event.off('docChange', docChange);
    });

    return data;
}
