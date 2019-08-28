import { PdfViewer } from '../index';
import { PdfViewerBase } from '../index';

/**
 * The `FormFields` module is to render formfields in the PDF document.
 * @hidden
 */
export class FormFields {
    private pdfViewer: PdfViewer;
    private pdfViewerBase: PdfViewerBase;
    private maxTabIndex: number;
    private minTabIndex: number;
    // tslint:disable-next-line
    private maintainTabIndex: any = {};
    // tslint:disable-next-line
    private maintanMinTabindex: any = {};
    /**
     * @private
     */
    constructor(viewer: PdfViewer, base: PdfViewerBase) {
        this.pdfViewer = viewer;
        this.pdfViewerBase = base;
    }
    /**
     * @private
     */
    public renderFormFields(pageIndex: number): void {
        this.maxTabIndex = 0;
        this.minTabIndex = -1;
        // tslint:disable-next-line
        let data: any = window.sessionStorage.getItem('formfields');
        if (data != null) {
            // tslint:disable-next-line
            let formFieldsData: any = JSON.parse(data);
            let textLayer: HTMLElement = document.getElementById(this.pdfViewer.element.id + '_textLayer_' + pageIndex);
            let canvasElement: HTMLElement = document.getElementById(this.pdfViewer.element.id + '_pageCanvas_' + pageIndex);
            if (formFieldsData !== null && canvasElement !== null && textLayer !== null) {
                for (let i: number = 0; i < formFieldsData.length; i++) {
                    // tslint:disable-next-line
                    let currentData: any = formFieldsData[i];
                    // tslint:disable-next-line
                    if (parseFloat(currentData['PageIndex']) == pageIndex) {
                        // tslint:disable-next-line
                        let inputField: any = this.createFormFields(currentData, pageIndex, i);
                        if (inputField) {
                            // tslint:disable-next-line
                            let bounds: any = currentData['LineBounds'];
                            // tslint:disable-next-line
                            let font: any = currentData['Font'];
                            this.applyPosition(inputField, bounds, font);
                            // tslint:disable-next-line
                            currentData['uniqueID'] = this.pdfViewer.element.id + 'input_' + pageIndex + '_' + i;
                            this.applyCommonProperties(inputField, pageIndex, i, currentData);
                            this.checkIsReadonly(currentData, inputField);
                            this.applyTabIndex(currentData, inputField, pageIndex);
                            this.checkIsRequiredField(currentData, inputField);
                            this.applyDefaultColor(inputField);
                            textLayer.appendChild(inputField);
                            inputField.addEventListener('focus', this.focusFormFields.bind(this));
                            inputField.addEventListener('blur', this.blurFormFields.bind(this));
                            inputField.addEventListener('click', this.updateFormFields.bind(this));
                            inputField.addEventListener('change', this.changeFormFields.bind(this));
                            inputField.addEventListener('keydown', this.updateFormFieldsValue.bind(this));
                        }
                    }
                }
                window.sessionStorage.removeItem('formfields');
                window.sessionStorage.setItem('formfields', JSON.stringify(formFieldsData));
            }
        }
    }
    /**
     * @private
     */
    // tslint:disable-next-line
    public downloadFormFieldsData(): any {
        // tslint:disable-next-line
        let data: any = window.sessionStorage.getItem('formfields');
        // tslint:disable-next-line
        let formFieldsData: any = JSON.parse(data);
        // tslint:disable-next-line
        let datas: any = {};
        for (let m: number = 0; m < formFieldsData.length; m++) {
            // tslint:disable-next-line
            let currentData: any = formFieldsData[m];
            if (currentData.Name === 'Textbox' || currentData.Name === 'Password' || currentData.Multiline) {
                datas[currentData.FieldName] = currentData.Text;
            } else if (currentData.Name === 'RadioButton' && currentData.Selected) {
                datas[currentData.GroupName] = currentData.Value;
            } else if (currentData.Name === 'CheckBox') {
                datas[currentData.GroupName] = currentData.Selected;
            } else if (currentData.Name === 'DropDown') {
                datas[currentData.Text] = currentData.SelectedValue;
            } else if (currentData.Name === 'ListBox') {
                // tslint:disable-next-line
                let childItems: any = currentData['TextList'];
                let childItemsText: string[] = [];
                for (let m: number = 0; m < currentData.SelectedList.length; m++) {
                    // tslint:disable-next-line
                    let currentElement: any = currentData.SelectedList[m];
                    childItemsText.push(childItems[currentElement]);
                }
                datas[currentData.Text] = JSON.stringify(childItemsText);
            }
        }
        return (JSON.stringify(datas));
    }
    private focusFormFields(event: MouseEvent): void {
        // tslint:disable-next-line
        let currentTarget: any = event.target;
        // tslint:disable-next-line
        let backgroundcolor: any = currentTarget.style.backgroundColor;
        // tslint:disable-next-line
        let currentIndex: any = backgroundcolor.lastIndexOf(',');
        // tslint:disable-next-line
        let currentColor: any = backgroundcolor.slice(0, currentIndex + 1) + 0 + ')';
        if (currentTarget.type === 'checkbox') {
            currentTarget.style.webkitAppearance = '';
        }
        currentTarget.style.backgroundColor = currentColor;
    }
    private blurFormFields(event: MouseEvent): void {
        // tslint:disable-next-line
        let currentTarget: any = event.target;
        // tslint:disable-next-line
        let backgroundcolor: any = currentTarget.style.backgroundColor;
        // tslint:disable-next-line
        let currentIndex: any = backgroundcolor.lastIndexOf(',');
        // tslint:disable-next-line
        let currentColor: any = backgroundcolor.slice(0, currentIndex + 1) + 0.2 + ')';
        if ((currentTarget.type === 'checkbox') && !currentTarget.checked) {
            currentTarget.style.webkitAppearance = 'none';
        } else {
            currentTarget.style.webkitAppearance = '';
        }
        currentTarget.style.backgroundColor = currentColor;
    }
    private updateFormFields(event: MouseEvent): void {
        // tslint:disable-next-line
        let currentTarget: any = event.target;
        if (currentTarget.className === 'e-pdfviewer-ListBox') {
            currentTarget = currentTarget.parentElement;
            this.updateDataInSession(currentTarget);
        }
    }
    private updateFormFieldsValue(event: MouseEvent): void {
        // tslint:disable-next-line
        let currentTarget: any = event.target;
        if (event.which === 9 && currentTarget && currentTarget.className === 'e-pdfviewer-formFields') {
            // tslint:disable-next-line
            let id: any = currentTarget.id.split('input_')[1].split('_')[0];
            if (this.maintainTabIndex[id] === currentTarget.tabIndex) {
                // tslint:disable-next-line
                let textLayer: HTMLElement = document.getElementById(this.pdfViewer.element.id + '_textLayer_' + (parseInt(id) + 1));
                if (textLayer) {
                    // tslint:disable-next-line
                    let currentFields: any = textLayer.getElementsByClassName('e-pdfviewer-formFields');
                    if (currentFields && currentFields.length > 0) {
                        currentFields[0].focus();
                        event.preventDefault();
                    }
                } else {
                    let textLayer: HTMLElement = document.getElementById(this.pdfViewer.element.id + '_textLayer_' + 0);
                    // tslint:disable-next-line
                    let currentFields: any = textLayer.getElementsByClassName('e-pdfviewer-formFields');
                    for (let m: number = 0; m < currentFields.length; m++) {
                        if (currentFields[m].tabIndex === this.maintanMinTabindex['0']) {
                            currentFields[m].focus();
                            event.preventDefault();
                            break;
                        }
                    }
                }
            } else {
                // tslint:disable-next-line
                let textLayer: HTMLElement = document.getElementById(this.pdfViewer.element.id + '_textLayer_' + parseInt(id));
                // tslint:disable-next-line
                let currentFields: any = textLayer.getElementsByClassName('e-pdfviewer-formFields');
                let istabindexed: boolean = true;
                for (let m: number = 0; m < currentFields.length; m++) {
                    istabindexed = false;
                    if (currentFields[m].tabIndex === (currentTarget.tabIndex + 1)) {
                        currentFields[m].focus();
                        istabindexed = true;
                        event.preventDefault();
                        break;
                    }
                }
                let tabindex: number = currentTarget.tabIndex + 1;
                while (!istabindexed) {
                    for (let l: number = 0; l < currentFields.length; l++) {
                        istabindexed = false;
                        if (currentFields[l].tabIndex === (tabindex)) {
                            currentFields[l].focus();
                            istabindexed = true;
                            event.preventDefault();
                            break;
                        }
                    }
                    if (this.maintainTabIndex[id] === tabindex) {
                        istabindexed = true;
                    }
                    tabindex = tabindex + 1;
                }
            }
        }
    }
    private changeFormFields(event: MouseEvent): void {
        // tslint:disable-next-line
        let currentTarget: any = event.target;
        this.updateDataInSession(currentTarget);
    }
    // tslint:disable-next-line
    private updateDataInSession(target: any): void {
        // tslint:disable-next-line
        let data: any = window.sessionStorage.getItem('formfields');
        // tslint:disable-next-line
        let FormFieldsData: any = JSON.parse(data);
        for (let m: number = 0; m < FormFieldsData.length; m++) {
            // tslint:disable-next-line
            let currentData: any = FormFieldsData[m];
            if (currentData.uniqueID === target.id) {
                if (target.type === 'text' || target.type === 'password' || target.type === 'textarea') {
                    currentData.Text = target.value;
                } else if (target.type === 'radio') {
                    for (let l: number = 0; l < FormFieldsData.length; l++) {
                        // tslint:disable-next-line
                        let currentType: any = FormFieldsData[l];
                        if (FormFieldsData[l].GroupName === target.name) {
                            FormFieldsData[l].Selected = false;
                        }
                    }
                    currentData.Selected = true;
                } else if (target.type === 'checkbox') {
                    if (target.checked) {
                        currentData.Selected = true;
                    } else {
                        currentData.Selected = false;
                    }
                } else if (target.type === 'select-one') {
                    // tslint:disable-next-line
                    let currentValue: any = target.options[target.selectedIndex].text;
                    // tslint:disable-next-line
                    let childrens: any = target.children;
                    let isChildElements: boolean = false;
                    for (let k: number = 0; k < childrens.length; k++) {
                        if (childrens[k].text === currentValue) {
                            currentData.SelectedValue = currentValue;
                        }
                    }
                } else if (target.type === 'select-multiple') {
                    // tslint:disable-next-line
                    let currentValue: any = target.selectedOptions;
                    currentData.SelectedList = [];
                    for (let z: number = 0; z < currentValue.length; z++) {
                        // tslint:disable-next-line
                        let childrens: any = target.children;
                        for (let k: number = 0; k < childrens.length; k++) {
                            if (childrens[k] === currentValue[z]) {
                                currentData.SelectedList.push(k);
                            }
                        }
                    }
                }
                break;
            } else if (target && target.getAttribute('list') != null && target.type === 'text' && currentData.uniqueID === target.list.id) {
                currentData.SelectedValue = target.value;
            }
        }
        window.sessionStorage.removeItem('formfields');
        window.sessionStorage.setItem('formfields', JSON.stringify(FormFieldsData));
    }
    // tslint:disable-next-line
    private applyCommonProperties(inputdiv: any, pageIndex: number, index: number, currentData: any): void {
        // tslint:disable-next-line
        let inputField: any = document.getElementById(this.pdfViewer.element.id + 'input_' + pageIndex + '_' + index);
        if (inputField) {
            inputField.remove();
        }
        if (currentData.IsSignatureField) {
            inputdiv.className = 'e-pdfviewer-signatureformFields';
        } else {
            inputdiv.className = 'e-pdfviewer-formFields';
        }
        inputdiv.id = this.pdfViewer.element.id + 'input_' + pageIndex + '_' + index;
        inputdiv.style.zIndex = 1000;
    }
    /**
     * @private
     */
    // tslint:disable-next-line
    public createFormFields(currentData: any, pageIndex: number, index?: number, printContainer?: any): void {
        // tslint:disable-next-line
        let currentField: any;
        // tslint:disable-next-line
        switch (currentData['Name']) {
            case 'Textbox':
                currentField = this.createTextBoxField(currentData, pageIndex, 'text');
                break;
            case 'Password':
                currentField = this.createTextBoxField(currentData, pageIndex, 'password');
                break;
            case 'RadioButton':
                currentField = this.createRadioBoxField(currentData, pageIndex, 'radio');
                break;
            case 'CheckBox':
                currentField = this.createRadioBoxField(currentData, pageIndex, 'checkbox', printContainer);
                break;
            case 'DropDown':
                currentField = this.createDropDownField(currentData, pageIndex, index, printContainer);
                break;
            case 'ListBox':
                currentField = this.createListBoxField(currentData, pageIndex);
                break;
            case 'SignatureField':
                currentField = this.createSignatureField(currentData, pageIndex);
                break;
        }
        return currentField;
    }
    // tslint:disable-next-line
    private createTextBoxField(data: any, pageIndex: number, type: string): any {
        // tslint:disable-next-line
        let inputField: any;
        if (data.Visible === 1) {
            return;
        }
        if (data.Multiline) {
            inputField = document.createElement('textarea');
            inputField.style.resize = 'none';
        } else {
            inputField = document.createElement('input');
            inputField.type = type;
        }
        if (data.MaxLength > 0) {
            inputField.maxLength = data.MaxLength;
        }
        this.addAlignmentPropety(data, inputField);
        if (data.Text !== '') {
            inputField.value = data.Text;
        } else {
            inputField.value = '';
        }
        inputField.name = data.FieldName;
        return inputField;
    }
    // tslint:disable-next-line
    private checkIsReadonly(data: any, inputField: any): void {
        if (data.IsReadonly) {
            inputField.disabled = true;
            inputField.style.cursor = 'default';
            inputField.style.backgroundColor = 'none';
        } else {
            // tslint:disable-next-line
            let borderColor: any = data.BackColor;
            inputField.style.backgroundColor = 'rgba(' + borderColor.R + ',' + borderColor.G + ',' + borderColor.B + ',' + 0.2 + ')';
            inputField.style.color = 'black';
        }
    }
    // tslint:disable-next-line
    private applyTabIndex(data: any, inputField: any, pageIndex: number): void {
        inputField.tabIndex = data.TabIndex;
        this.maxTabIndex = Math.max(this.maxTabIndex, inputField.tabIndex);
        if (this.minTabIndex === -1) {
            this.minTabIndex = inputField.tabIndex;
        }
        this.minTabIndex = Math.min(this.minTabIndex, inputField.tabIndex);
        this.maintainTabIndex[pageIndex.toString()] = this.maxTabIndex;
        this.maintanMinTabindex[pageIndex.toString()] = this.minTabIndex;
    }
    // tslint:disable-next-line
    private checkIsRequiredField(data: any, inputField: any): void {
        if (data.IsRequired) {
            inputField.required = true;
            inputField.style.border = '1px solid red';
        } else {
            // tslint:disable-next-line
            let borderColor: any = data.BorderColor;
            inputField.style.border = data.BorderWidth;
            inputField.style.borderColor = 'rgba(' + borderColor.R + ',' + borderColor.G + ',' + borderColor.B + ',' + 1 + ')';
        }
        if (inputField.type !== 'checkbox' && inputField.type !== 'radio') {
            inputField.style.borderStyle = 'solid';
        }
    }
    // tslint:disable-next-line
    private applyDefaultColor(inputField: any): void {
        if (inputField.style.backgroundColor === 'rgba(255, 255, 255, 0.2)' || inputField.style.backgroundColor === 'rgba(0, 0, 0, 0.2)') {
            inputField.style.backgroundColor = 'rgba(0, 20, 200, 0.2)';
        }
    }
    // tslint:disable-next-line
    private addAlignmentPropety(data: any, inputField: any): any {
        // tslint:disable-next-line
        let alignment: any = data.Alignment;
        switch (alignment) {
            case 0:
                inputField.style.textAlign = 'left';
                break;
            case 1:
                inputField.style.textAlign = 'center';
                break;
            case 2:
                inputField.style.textAlign = 'right';
                break;
            case 3:
                inputField.style.textAlign = 'justify';
                break;
        }
    }
    // tslint:disable-next-line
    private createRadioBoxField(data: any, pageIndex: number, type: string, printContainer?: any): any {
        // tslint:disable-next-line
        let inputField: any = document.createElement('input');
        inputField.type = type;
        if (data.Selected) {
            inputField.checked = true;
        } else if (type === 'checkbox' && !printContainer) {
            inputField.style.webkitAppearance = 'none';
        }
        inputField.name = data.GroupName;
        inputField.value = data.Value;
        return inputField;
    }
    // tslint:disable-next-line
    private createDropDownField(data: any, pageIndex: number, index: number, printContainer: any): any {
        // tslint:disable-next-line
        let inputField: any = document.createElement('select');
        // tslint:disable-next-line
        let childItems = data['TextList'];
        if (data.Selected) {
            // tslint:disable-next-line
            let previousField: any = document.getElementById('editableDropdown' + pageIndex + '_' + index);
            if (previousField) {
                previousField.remove();
            }
            // tslint:disable-next-line
            let inputFields: any = document.createElement('input');
            inputFields.id = 'editableDropdown' + pageIndex + '_' + index;
            inputFields.setAttribute('list', this.pdfViewer.element.id + 'input_' + pageIndex + '_' + index);
            // tslint:disable-next-line
            let bounds: any = data['LineBounds'];
            // tslint:disable-next-line
            let font: any = data['Font'];
            this.applyPosition(inputFields, bounds, font);
            inputFields.style.backgroundColor = 'rgba(0, 20, 200, 0.2)';
            inputFields.className = 'e-pdfviewer-formFields';
            if (data.selectedIndex === -1) {
                inputFields.value = data.SelectedValue;
            }
            if (printContainer) {
                printContainer.appendChild(inputFields);
            } else {
                let textLayer: HTMLElement = document.getElementById(this.pdfViewer.element.id + '_textLayer_' + pageIndex);
                textLayer.appendChild(inputFields);
            }
            inputFields.addEventListener('focus', this.focusFormFields.bind(this));
            inputFields.addEventListener('blur', this.blurFormFields.bind(this));
            inputFields.addEventListener('click', this.updateFormFields.bind(this));
            inputFields.addEventListener('change', this.changeFormFields.bind(this));
            inputFields.addEventListener('keydown', this.updateFormFieldsValue.bind(this));
            inputField = document.createElement('DATALIST');
        }
        for (let j: number = 0; j < childItems.length; j++) {
            // tslint:disable-next-line
            let option: any = document.createElement('option');
            option.className = 'e-dropdownSelect';
            if (data.SelectedValue === childItems[j]) {
                option.selected = true;
            } else {
                option.selected = false;
            }
            option.innerHTML = childItems[j];
            inputField.appendChild(option);
        }
        inputField.name = data.Text;
        return inputField;
    }
    // tslint:disable-next-line
    private createListBoxField(data: any, pageIndex: number): any {
        // tslint:disable-next-line
        let inputField: any = document.createElement('select');
        inputField.multiple = true;
        // tslint:disable-next-line
        let childItems: any = data['TextList'];
        for (let j: number = 0; j < childItems.length; j++) {
            // tslint:disable-next-line
            let option: any = document.createElement('option');
            option.className = 'e-pdfviewer-ListBox';
            for (let k: number = 0; k < data.SelectedList.length; k++) {
                if (data.SelectedList[k] === j) {
                    option.selected = true;
                }
            }
            option.innerHTML = childItems[j];
            inputField.appendChild(option);
        }
        inputField.name = data.Text;
        return inputField;
    }
    // tslint:disable-next-line
    private createSignatureField(data: any, pageIndex: number): any {
        // tslint:disable-next-line
        let inputField: any = document.createElement('input');
        inputField.type = 'text';
        return inputField;
    }
    // tslint:disable-next-line
    private applyPosition(inputField: any, bounds: any, font: any): void {
        if (bounds) {
            let left: number = this.ConvertPointToPixel(bounds.X);
            let top: number = this.ConvertPointToPixel(bounds.Y);
            let width: number = this.ConvertPointToPixel(bounds.Width);
            let height: number = this.ConvertPointToPixel(bounds.Height);
            let fontHeight: number = 0;
            if (font !== null && font.Height) {
                inputField.style.fontfamily = font.Name;
                if (font.Italic) {
                    inputField.style.fontStyle = 'italic';
                }
                if (font.Bold) {
                    inputField.style.fontWeight = 'Bold';
                }
                fontHeight = this.ConvertPointToPixel(font.Size);
            }
            this.setStyleToTextDiv(inputField, left, top, fontHeight, width, height, false);
        }
    }
    /**
     * @private
     */
    // tslint:disable-next-line:max-line-length
    public setStyleToTextDiv(textDiv: HTMLElement, left: number, top: number, fontHeight: number, width: number, height: number, isPrint: boolean): void {
        textDiv.style.position = 'absolute';
        let zoomvalue: number = this.pdfViewerBase.getZoomFactor();
        if (isPrint) {
            zoomvalue = 1;
        }
        textDiv.style.left = left * zoomvalue + 'px';
        textDiv.style.top = top * zoomvalue + 'px';
        textDiv.style.height = height * zoomvalue + 'px';
        textDiv.style.width = width * zoomvalue + 'px';
        textDiv.style.margin = '0px';
        if (fontHeight > 0) {
            textDiv.style.fontSize = fontHeight * zoomvalue + 'px';
        }
    }
    /**
     * @private
     */
    // tslint:disable-next-line
    public ConvertPointToPixel(number: any): any {
        return (number * (96 / 72));
    }
    /**
     * @private
     */
    public getModuleName(): string {
        return 'FormFields';
    }
}
