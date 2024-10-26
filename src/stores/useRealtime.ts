import { onMount } from 'svelte';
import { writable } from 'svelte/store';
import { onDocChange } from 'pocketto';
import type { ModelStatic } from 'pocketto/dist/src/definitions/Model';
import { BaseModel } from 'pocketto';

export function useRealtime<T extends BaseModel>(type: ModelStatic<T>, id?: string) {
    const data = writable<T>(new type());

    onMount(async () => {
        if (!id) return;
        const doc = await new type().getClass().find(id);
        if (!doc) return;
        data.set(doc as T);
    });

    onDocChange(async (newId) => {
        const modelName = new type().getClass().collectionName as string + '.';
        newId = newId.replace(modelName, '');
        if (newId !== id) return;
        const doc = await new type().getClass().find(id);
        if (!doc) return;
        data.set(doc as T);
    });

    return data;
}
