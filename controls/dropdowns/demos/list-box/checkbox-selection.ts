/**
 * Checkbox Selection Sample
 */
import { ListBox } from '../../src/list-box/index';
import { CheckBoxSelection } from '../../src/multi-select/checkbox-selection';

ListBox.Inject(CheckBoxSelection);


let data: { [key: string]: Object }[] = [
    { text: 'Hennessey Venom', id: 'list-01' },
    { text: 'Bugatti Chiron', id: 'list-02' },
    { text: 'Bugatti Veyron Super Sport', id: 'list-03' },
    { text: 'SSC Ultimate Aero', id: 'list-04' },
    { text: 'Koenigsegg CCR', id: 'list-05' },
    { text: 'McLaren F1', id: 'list-06' },
    { text: 'Aston Martin One- 77', id: 'list-07' },
    { text: 'Jaguar XJ220', id: 'list-08' },
    { text: 'McLaren P1', id: 'list-09' },
    { text: 'Ferrari LaFerrari', id: 'list-10' },
];

let listObj: ListBox = new ListBox({ dataSource: data, selectionSettings: { showCheckbox: true, showSelectAll: true }, enablePersistence: true });
listObj.appendTo('#listbox');