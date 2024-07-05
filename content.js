const syncicon = `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><path d="M434.67 285.59v-29.8c0-98.73-80.24-178.79-179.2-178.79a179 179 0 00-140.14 67.36m-38.53 82v29.8C76.8 355 157 435 256 435a180.45 180.45 0 00140-66.92" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M32 256l44-44 46 44M480 256l-44 44-46-44"/></svg>`

class Dombuilder {
    constructor(tag) {
        this.element = document.createElement(tag);
        return this;
    }

    attr(name, value) {
        this.element.setAttribute(name, value);
        return this;
    }

    class(classNames) {
        this.element.classList.add(classNames);
        return this;
    }

    classes(classNames) {
        classNames.forEach(className => {
            this.element.classList.add(className);
        });
        return this;
    }

    styles(styleObj) {
        for (const [key, value] of Object.entries(styleObj)) {
            this.element.style[key] = value;
        }
        return this;
    }

    event(eventName, callback) {
        this.element.addEventListener(eventName, callback);
        return this;
    }
    append(dom) {
        this.element.appendChild(dom);
        return this;
    }
    renderTo(dom) {
        dom.appendChild(this.element);
        return this;
    }
    html(string) {
        this.element.innerHTML = `${string}`
        return this;
    }
    appendHtml(string) {
        this.element.innerHTML += `${string}`
        return this;
    }
}
function e(el) {
    return new Dombuilder(el);
}


class Downloader {
    constructor() {
        this.imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        this.ui = null;
        this.minImgSize = localStorage.getItem('minImgSize') ? parseInt(localStorage.getItem('minImgSize')) : 400;
        this.images = {
            MainImage: [],
            VariantImage: [],
            OtherImage: [],
            all: [],
        };
        this.ImagesUiObject = {
            contentareas: {},
            counter: {},
            loading: {},
            groups: {},
        };

        this.createUi();
        this.titleNode = document.querySelector('h1');
        this.mainTitle = this.titleNode ? this.titleNode.innerText : document.title || 'images';
    }



    createUi() {
        this.ui = e('div').classes(['id-downloader-app']);

        this.title = e('h3').class('id-ui-title').html('Image Downloader');
        this.ui.append(this.title.element);

        this.closeTrigger = e('span').class('id-close')
            .html('&times;')
            .event('click', () => {
                this.ui.element.remove();
            });
        this.ui.append(this.closeTrigger.element);

        //Settings
        let settingsTrigger = e('span').class('settings-trigger').html('Settings');
        this.ui.append(settingsTrigger.element);

        //Settings UI
        this.settingsUi = e('div').class('id-settings-section').styles({ display: 'none' });
        this.settingsTitle = e('h4').class('id-settings-title').html('Settings');
        this.settingsUi.append(this.settingsTitle.element);
        this.settingsUi.append(e('hr').element);
        this.settingsContent = e('div').class('id-settings-content');
        this.settingsContent.append(
            e('div').class('id-settings-area').append(
                e('label').class('id-input-label').html('Min Image Size (px): ').element
            ).append(
                e('div').class('id-input-area').append(
                    e('input').attr('type', 'number').attr('min', '1').attr('max', '1000').attr('value', this.minImgSize).event('input', (e) => {
                        this.minImgSize = parseInt(e.target.value);
                        localStorage.setItem('minImgSize', this.minImgSize);
                    }).element
                ).append(
                    e('span').class('id-rescan').html(syncicon).event('click', () => {
                        this.imageArea.element.innerHTML = '';
                        this.startProcess();
                    }).element
                ).element
            ).element
        );
        //append to body
        this.settingsUi.append(this.settingsContent.element);
        this.ui.append(this.settingsUi.element);


        settingsTrigger.event('click', () => {
            if (!this.settingsOpened) {
                this.settingsOpened = true;
                this.settingsUi.styles({ display: 'block' });
                settingsTrigger.styles({ color: 'rgb(229, 45, 3)' });
            } else {
                this.settingsOpened = false;
                this.settingsUi.styles({ display: 'none' });
                settingsTrigger.styles({ color: '#333' });
            }
        });

        this.overflowArea = e('div').styles({ height: 'calc(100% - 46px)', marginTop: '16px', width: '100%', maxHeight: '400px', overflowY: 'auto', scrollbarWidth: 'thin' });
        this.imageArea = e('div').class('ui-images-area').styles(
            { display: 'flex', flexDirection: 'column' }
        );
        this.overflowArea.append(this.imageArea.element);

        this.ui.append(this.overflowArea.element);

        // Add download button
        this.downloadCount = e('span').styles({ color: 'inherit' }).class('selected2down').html(`${this.selectedCount()} image${this.selectedCount() > 1 ? "s" : ''}`);
        this.downloadButton = e('button').class('id-dwn-btn').html('Download ').event('click', () => {
            this.downloadSelectedImages();
        });
        this.downloadButton.append(this.downloadCount.element);
        this.ui.append(this.downloadButton.element);
        this.startProcess();
    }

    startProcess() {
        this.images = {
            MainImage: [],
            VariantImage: [],
            OtherImage: [],
            all: [],
        };
        this.ImagesUiObject = {
            contentareas: {},
            counter: {},
            loading: {},
            groups: {},
        };
        this.renderImagesUi();
        this.scanImages();
    }

    async checkImageDimensions(src, minSize) {
        return new Promise((resolve, reject) => {
            const tempImg = new Image();
            tempImg.onload = () => {
                if (tempImg.naturalWidth >= minSize && tempImg.naturalHeight >= minSize) {
                    resolve({ width: tempImg.naturalWidth, height: tempImg.naturalHeight }); // Resolve with true if dimensions are met
                } else {
                    resolve(false); // Resolve with false if dimensions are not met
                }
            };
            tempImg.onerror = () => {
                resolve(false); // Handle loading errors by resolving with false
            };
            tempImg.src = src; // Set the src attribute to trigger the onload event
        });
    }


    async scanImages() {
        this.ImagesUiObject.loading.all.styles({ display: 'flex' });
        this.ImagesUiObject.loading.MainImage.styles({ display: 'flex' });
        this.ImagesUiObject.loading.VariantImage.styles({ display: 'flex' });

        this.MainImage().then(() => {
            this.ImagesUiObject.loading.MainImage.styles({ display: 'none' });
        });

        this.VariantImageScan().then(() => {
            this.ImagesUiObject.loading.VariantImage.styles({ display: 'none' });
        });

        this.AllimageScan().then(() => {
            this.ImagesUiObject.loading.all.styles({ display: 'none' });
            if (this.images.all.length == 0) {
                console.log(this.images.all.length);
                this.imageArea.element.innerHTML = `<label class='no-image-found'>No images found</label>`;
                this.downloadButton.styles({ display: 'none' });
            }
        });
    }



    async AllimageScan() {
        const images = document.querySelectorAll('img');
        for (let img of images) {
            const src = this.srcFilter(img.src);
            try {
                const isImageLargeEnough = await this.checkImageDimensions(src, this.minImgSize);
                if (isImageLargeEnough) {
                    this.ImagesUiObject.groups.all.styles({ 'display': 'block' });
                    let name = src.split('/').pop();
                    let title = img.alt || img.title || name.replace('-', ' ');
                    const exists = this.images.all.some(image => image.name === name);
                    const imageObj = { src, name, title, size: isImageLargeEnough }
                    if (!exists) {
                        this.images.all.push(imageObj);
                        const imageElement = this.createImageElement(imageObj);
                        imageElement.element.setAttribute('data-src', imageObj.src);
                        this.ImagesUiObject.contentareas.all.append(imageElement.element);
                        this.ImagesUiObject.counter.all.html(`(${this.images.all.length})`);
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }
    }

    async MainImage() {
        let obStr = 'MainImage';
        let images = [];
        if (window.location.href.includes('alibaba.com')) {
            images = document.querySelectorAll('.detail-product-image .image-list img');
        } else if (window.location.href.includes('aliexpress.com')) {
            images = document.querySelectorAll('.pdp-info-left img');
        }

        await this.groupInner(images, obStr);
    }

    async VariantImageScan() {
        let obStr = 'VariantImage';
        let images = [];
        if (window.location.href.includes('alibaba.com')) {
            images = document.querySelectorAll('.layout-right img');
        } else if (window.location.href.includes('aliexpress.com')) {
            images = document.querySelectorAll('.pdp-info-right img');
        }

        await this.groupInner(images, obStr);

    }

    async groupInner(images, obStr) {
        let i = 0;
        for (let img of images) {
            i++;
            const src = this.srcFilter(img.src);
            try {
                const isImageLargeEnough = await this.checkImageDimensions(src, this.minImgSize);
                if (isImageLargeEnough) {
                    this.ImagesUiObject.groups[obStr].styles({ 'display': 'block' });
                    let name = src.split('/').pop();
                    let title = this.mainTitle || img.alt || img.title || name.replace('-', ' ');
                    title += '-' + i;
                    const exists = this.images[obStr].some(image => image.name === name);
                    const imageObj = { src, name, title, size: isImageLargeEnough }
                    if (!exists) {
                        this.images[obStr].push(imageObj);
                        const imageElement = this.createImageElement(imageObj);
                        imageElement.element.setAttribute('data-src', imageObj.src);
                        this.ImagesUiObject.contentareas[obStr].append(imageElement.element);
                        this.ImagesUiObject.counter[obStr].html(`(${this.images[obStr].length})`);
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }
    }



    srcFilter(src) {
        const index = this.imageExtensions.findIndex(ext => src.toLowerCase().indexOf(ext) !== -1);
        if (index !== -1) {
            const extension = this.imageExtensions[index];
            src = src.slice(0, src.toLowerCase().indexOf(extension) + extension.length);
        }

        // Default behavior for all other sites
        const regexes = [
            /-\d+x\d+(\.\w+)$/i, // Matches patterns like -123x456.jpg
            /_\d+x\d+(\.\w+)$/i, // Matches patterns like _123x456.jpg
            /\/\d+x\d+(\.\w+)$/i, // Matches patterns like /123x456.jpg
            /\/\d+x\d+_\w+(\.\w+)$/i, // Matches patterns like /123x456_image.jpg
            /\/\d+x\d+_\w+$/i, // Matches patterns like /123x456_image
        ];

        regexes.forEach(regex => {
            src = src.replace(regex, '$1');
        });

        return src;
    }



    checkBoxDesign(checkbox) {
        const checkBoxDesign = e('div').class('checkbox-wrapper-31');
        checkBoxDesign.append(checkbox.element);
        const selectAllSvg = e('svg').styles({ display: 'flex' }).html(`<svg viewBox="0 0 35.6 35.6">
                    <circle class="background" cx="17.8" cy="17.8" r="17.8"></circle>
                    <circle class="stroke" cx="17.8" cy="17.8" r="14.37"></circle>
                    <polyline class="check" points="11.78 18.12 15.55 22.23 25.17 12.87"></polyline>
                </svg>`);
        checkBoxDesign.append(selectAllSvg.element);
        return checkBoxDesign;
    }


    createImageElement = (image) => {
        const imgWrapper = e('div').class('id-image-wrap');

        const checkbox = e('input').attr('type', 'checkbox').styles({ margin: '0 5px' });
        checkbox.event('change', () => {
            image.selected = checkbox.element.checked;
            this.downloadCount.html(`${this.selectedCount()} image${this.selectedCount() > 1 ? "s" : ''}`);
        });
        const checkBoxDesign = this.checkBoxDesign(checkbox);

        const imgElement = e('img').class('id-img-item').attr('src', image.src);

        const imgInfo = e('div').class('id-img-info');
        const imgName = e('span').class('id-img-name').html(image.title);
        imgInfo.append(imgName.element);

        //dimension info 
        const dimensionInfo = e('span').class('id-img-dimension').html(`Dimensions: ${image.size ? `${image.size.width}x${image.size.height}` : 'Unknown'}`);
        imgInfo.append(dimensionInfo.element);

        // Add download link for each image
        const downloadLink = e('button').class('id-single-download').html(`<svg xmlns="http://www.w3.org/2000/svg" style="stroke: rgb(229, 45, 3);color: rgb(229, 45, 3)" class="ionicon" viewBox="0 0 512 512">
<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 268l144 144 144-144M256 392V100"/>
</svg>`);

        downloadLink.event('click', async () => {
            const response = await fetch(image.src);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const slug = this.stringToSlug(image.title);
            const extension = image.name.split('.').pop(); // Get the file extension from image.name

            a.download = `${slug}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });


        imgWrapper.append(checkBoxDesign.element);
        imgWrapper.append(imgElement.element);
        imgWrapper.append(imgInfo.element);
        imgWrapper.append(downloadLink.element);

        return imgWrapper;
    }

    createCollapsibleGroup = (titleText, prop) => {
        const images = this.images[prop];

        const groupWrapper = e('div').class('id-group-wrapper').styles({ padding: '4px 8px' });

        const groupTitle = e('div').class('id-group-title-wraper');
        const groupTitleText = e('h4').class('id-group-title').html(`${titleText}`);

        const gCounter = e('span');
        this.ImagesUiObject.counter[prop] = gCounter;
        groupTitleText.append(gCounter.element);

        //scan loader
        let scanLoader = e('span').html(syncicon).class('scan-loading');
        groupTitleText.append(scanLoader.element);
        this.ImagesUiObject.loading[prop] = scanLoader;

        const selectAllCheckbox = e('input').attr('type', 'checkbox');
        const checkBoxDesign = this.checkBoxDesign(selectAllCheckbox);

        selectAllCheckbox.event('change', (event) => {
            const checked = selectAllCheckbox.element.checked;
            try {
                images.forEach(image => {
                    image.selected = checked;
                    const imageElement = groupContent.element.querySelector(`[data-src="${image.src}"]`);
                    if (imageElement) {
                        imageElement.querySelector('input[type="checkbox"]').checked = checked;
                    }
                });
                this.downloadCount.html(`${this.selectedCount()} image${this.selectedCount() > 1 ? "s" : ''}`);
            } catch (error) {
                console.error('Error selecting/deselecting images:', error);
            }

        });

        groupTitle.append(checkBoxDesign.element);
        groupTitle.append(groupTitleText.element);

        const groupContent = e('div').styles({ display: 'none' });
        this.ImagesUiObject.contentareas[prop] = groupContent;
        // images.forEach(image => {
        //     const imageElement = this.createImageElement(image);
        //     imageElement.element.setAttribute('data-src', image.src);
        //     groupContent.append(imageElement.element);
        // });
        groupWrapper.append(groupTitle.element);
        groupWrapper.append(groupContent.element);

        groupTitleText.event('click', () => {
            const isHidden = groupContent.element.style.display === 'none';
            groupContent.styles({ display: isHidden ? 'block' : 'none' });
        });

        return groupWrapper;
    }

    renderImagesUi() {
        this.createGroupsDom();
    }

    createGroupsDom() {

        this.ImagesUiObject.groups.MainImage = this.createCollapsibleGroup('Main Images', 'MainImage');
        this.imageArea.append(this.ImagesUiObject.groups.MainImage.element);

        this.ImagesUiObject.groups.VariantImage = this.createCollapsibleGroup('Variant Images', 'VariantImage');
        this.imageArea.append(this.ImagesUiObject.groups.VariantImage.element);

        //this.otherGroup = this.createCollapsibleGroup('Other Images', 'OtherImage');
        //this.imageArea.append(this.otherGroup.element);

        this.ImagesUiObject.groups.all = this.createCollapsibleGroup('All Images', 'all');
        this.imageArea.append(this.ImagesUiObject.groups.all.element);


    }

    stringToSlug(str) {
        str = str.replace(/^\s+|\s+$/g, ''); // trim
        str = str.toLowerCase();

        // remove accents, swap ñ for n, etc
        let from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
        let to = "aaaaeeeeiiiioooouuuunc------";
        for (let i = 0, l = from.length; i < l; i++) {
            str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
        }

        str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
            .replace(/\s+/g, '-') // collapse whitespace and replace by -
            .replace(/-+/g, '-'); // collapse dashes

        return str;
    }

    getSelectedImages() {
        // Get selected images from all groups
        const selectedMainImages = this.images.MainImage.filter(image => image.selected);
        const selectedOtherImages = this.images.OtherImage.filter(image => image.selected);
        const selectedVariantImage = this.images.VariantImage.filter(image => image.selected);
        const selectedAllImages = this.images.all.filter(image => image.selected);

        // Concatenate all selected images into one array
        const selectedImages = [
            ...selectedMainImages,
            ...selectedVariantImage,
            ...selectedOtherImages,
            ...selectedAllImages,
        ];

        return selectedImages;
    }

    selectedCount() {
        const selectedImages = this.getSelectedImages();
        return selectedImages.length;
    }

    async downloadSelectedImages() {
        this.downloadButton.html('Downloading, Please Wait...');
        const selectedImages = this.getSelectedImages();
        if (selectedImages.length === 0) {
            alert('No images selected.');
            return;
        }

        const zip = new JSZip();
        const folder = zip.folder('images');

        // Function to fetch image blob or base64 data
        const getImageData = async (src) => {
            try {
                const response = await fetch(src);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image ${src}: ${response.status} ${response.statusText}`);
                }
                const blob = await response.blob();
                // Convert blob to base64
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error(`Error fetching image ${src}:`, error);
                throw error; // Rethrow the error to handle it later
            }
        };

        // Array to hold all promises for fetching image data
        const promises = selectedImages.map(async image => {
            try {
                const imageData = await getImageData(image.src);

                const slug = this.stringToSlug(image.title);
                const extension = image.name.split('.').pop(); // Get the file extension from image.name
                //const finalString = `${slug}.${extension}`;
                const finalString = image.name;

                folder.file(finalString, imageData, { base64: true });
            } catch (error) {
                console.error(`Error fetching image ${image.src}:`, error);
            }
        });

        // Wait for all promises to resolve
        Promise.all(promises)
            .then(() => {
                // Generate the ZIP file
                zip.generateAsync({ type: 'blob' })
                    .then(content => {
                        // Create a link element to trigger the download
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(content);
                        link.download = `${this.mainTitle}.zip`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        this.downloadButton.html(`Downloaded successfully ${promises.length} image${promises.length > 1 ? 's' : ''}`);
                        this.downloadButton.styles({ backgroundColor: '#2d953c' });
                        setTimeout(() => {
                            //#e52d03
                            this.downloadButton.styles({ backgroundColor: '#e52d03' });
                            this.downloadButton.html('Download ');
                            this.downloadButton.append(this.downloadCount.element);
                        }, 2000);
                    })
                    .catch(error => {
                        console.error('Error generating ZIP:', error);
                    });
            })
            .catch(error => {
                console.error('Error fetching images:', error);
            });
    }

    renderApp(dom) {
        dom.append(this.ui.element);
    }
}

function idRunApp() {
    let app = new Downloader();
    app.renderApp(document.body);
}

const downloadButton = e('button')
    .styles({
        position: 'fixed',
        bottom: '85px',
        right: '10px',
        zIndex: '1000',
        width: '35px',
        height: '35px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: '1px solid rgba(0, 0, 0, .2)',
        borderRadius: '50%',
        padding: '5px',
        background: 'rgb(229, 45, 3)',
        color: '#fff'
    }).attr("title", "Download Images")
    .event('click', function () {
        idRunApp();
    })
    .renderTo(document.body);

downloadButton.html(`
        <svg xmlns="http://www.w3.org/2000/svg" style="stroke: #fff;" class="ionicon" viewBox="0 0 512 512">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 268l144 144 144-144M256 392V100"/>
        </svg>
    `);

// Listen for messages from the background script
// content.js
// Define the method you want to call from background.js

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "openidDownloader") {
        idRunApp();
    }
});
