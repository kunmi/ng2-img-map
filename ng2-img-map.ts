import {
    Component, ElementRef, EventEmitter, Input, Output, Renderer, ViewChild
} from '@angular/core';

@Component({
    selector: 'img-map',
    styles: [
        '.img-map { position: relative; }',
        '.img-map canvas, .img-map img { position: absolute; top: 0; left: 0; }',
        '.img-map img { display: block; height: auto; max-width: 100%; }'
    ],
    template: `
        <div
                class="img-map"
                #container
                (window:resize)="onResize($event)"
        >
            <img
                    #image
                    [src]="src"
                    (load)="onLoad($event)"
            >
            <canvas
                    #canvas
                    (click)="onClick($event)"
                    (mousemove)="onMousemove($event)"
                    (mouseout)="onMouseout($event)"
            ></canvas>
        </div>
    `
})
export class ImgMapComponent {

    /**
     * Canvas element.
     */
    @ViewChild('canvas')
    private canvas: ElementRef;

    /**
     * Container element.
     */
    @ViewChild('container')
    private container: ElementRef;

    /**
     * Image element.
     */
    @ViewChild('image')
    private image: ElementRef;

    @Input('markers')
    set setMarkers(markers: Marker[]) {
        this.markerActive = null;
        this.markerHover = null;
        this.markers = markers;
        this.draw();
    }


    /**
     * Image source URL.
     */
    @Input()
    src: string;

    /**
     * On change event.
     */
    @Output('change')
    private changeEvent = new EventEmitter<Marker>();

    /**
     * On mark event.
     */
    @Output('mark')
    private markEvent = new EventEmitter<Marker>();

    /**
     *
     * Post Render to Enable Access to Component Context
     *
     *
     */
    @Output ('viewDidAppear')
    private afterinitEvent = new EventEmitter<ImgMapComponent>();


    /**
     * Collection of markers.
     */
    private markers: Marker[] = [];

    /**
     * Index of the hover state marker.
     */
    private markerHover: number = null;





    /**
     *  Quality of drawn image - low|medium|high. Dependent on if ImageSmoothing is enabled
     * @type {string}
     */
    imageSmoothingQuality = "low";

    imageSmoothingEnabled = false;



    /**
     * Index of the active state marker.
     */
    private markerActive: number;

    constructor(private renderer: Renderer) {}

    private change(): void {
        if (this.markerActive === null) {
            this.changeEvent.emit(null);
        } else {
            this.changeEvent.emit(this.markers[this.markerActive]);
        }
        this.draw();
    }

    /**
     * Get the cursor position relative to the canvas.
     */
    private cursor(event: MouseEvent): number[] {
        const rect = this.canvas.nativeElement.getBoundingClientRect();
        return [
            event.clientX - rect.left,
            event.clientY - rect.top
        ];
    }

    /**
     * Draw a marker.
     */
    private drawMarker(marker: Marker, type?: string): void {
        const context = this.canvas.nativeElement.getContext('2d');
        context.beginPath();
        let pixel:number[] =  marker.getCoordsAsPixel(this.image);

        switch (marker.base)
        {
            case ShapeType.Circle:
                context.arc(pixel[0], pixel[1], marker.size, 0, 2 * Math.PI);
                break;

            case ShapeType.Square:
                context.rect(pixel[0], pixel[1], marker.size, marker.size);
                break;
        }
        switch (type) {
            case 'active':
                context.fillStyle = 'rgba(255, 0, 0, 0.6)';
                break;
            case 'hover':
                context.fillStyle = 'rgba(0, 0, 255, 0.6)';
                break;
            default:
                context.fillStyle = 'rgba(0, 0, 255, 0.4)';
        }
        context.fill();

        if(marker.type == MarkerType.Composite){
            context.beginPath();

            if(marker.type != null)
            {
                switch (marker.base)
                {
                    case ShapeType.Square:

                        pixel[0] = (pixel[0] + marker.size/2) - marker.imageWidth/2;
                        pixel[1] = (pixel[1] + marker.size/2) - marker.imageHeight/2;
                        break;

                    case ShapeType.Circle:
                        pixel[0] = (pixel[0] - marker.imageWidth/2);
                        pixel[1] = (pixel[1] - marker.imageHeight/2);
                        break;
                }


            }
            if(this.imageSmoothingEnabled)
            {
                context.mozImageSmoothingEnabled = true;
                context.imageSmoothingQuality = this.imageSmoothingQuality;
                context.webkitImageSmoothingEnabled = true;
                context.msImageSmoothingEnabled = true;
                context.imageSmoothingEnabled = true;
            }

            context.drawImage(marker.image, pixel[0], pixel[1], marker.imageWidth, marker.imageHeight);
        }

    }

    /**
     * Check if a position is inside a marker.
     */
    private insideMarker(marker: Marker, coordinate: number[]): boolean {

        let pixel = marker.getCoordsAsPixel(this.image);
        if (marker.base == ShapeType.Circle) {

            return Math.sqrt(
                (coordinate[0] - pixel[0]) * (coordinate[0] - pixel[0])
                + (coordinate[1] - pixel[1]) * (coordinate[1] - pixel[1])
            ) < marker.size;
        }
        else
        {
            return coordinate[0]>=pixel[0] && coordinate[0]<=((pixel[0])+marker.size)
                &&
                coordinate[1]>=pixel[1] && coordinate[1]<=((pixel[1])+marker.size);
        }
    }


    createMarker(coords: number[], shape?:ShapeType): Marker{
        let dimension = this.pixelToMarker(coords);
        return new Marker(dimension[0], dimension[1], shape);
    }

    /**
     * Convert a pixel position to a percentage position.
     **/
    private pixelToMarker(pixel: number[]): number[] {
        const image: HTMLImageElement = this.image.nativeElement;
        return [
            (pixel[0] / image.clientWidth) * 100,
            (pixel[1] / image.clientHeight) * 100
        ];
    }

    /**
     * Sets the new marker position.

     **/

    private mark(pixel: number[]): void {
        this.markerActive = this.markers.length;

        this.markers.push(this.createMarker(pixel));
        this.draw();
        this.markEvent.emit(this.markers[this.markerActive]);
    }


    /**
     * Sets the marker pixel positions.

     */

    /**
     * Clears the canvas and draws the markers.
     */
    draw(): void {
        const canvas: HTMLCanvasElement = this.canvas.nativeElement;
        const container: HTMLDivElement = this.container.nativeElement;
        const image: HTMLImageElement = this.image.nativeElement;
        const height = image.clientHeight;
        const width = image.clientWidth;
        this.renderer.setElementAttribute(canvas, 'height', `${height}`);
        this.renderer.setElementAttribute(canvas, 'width', `${width}`);
        this.renderer.setElementStyle(container, 'height', `${height}px`);
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, width, height);

        this.markers.forEach((marker, index) => {
            if (this.markerActive === index) {
                this.drawMarker(marker, 'active');
            } else if (this.markerHover === index) {
                this.drawMarker(marker, 'hover');
            } else {
                this.drawMarker(marker);
            }
        });
    }

    private onClick(event: MouseEvent): void {
        const cursor = this.cursor(event);
        var active = false;
        if (this.changeEvent.observers.length) {
            var change = false;
            this.markers.forEach((marker, index) => {
                if (this.insideMarker(marker, cursor)) {
                    active = true;
                    if (this.markerActive === null || this.markerActive !== index) {
                        this.markerActive = index;
                        change = true;
                    }
                }
            });
            if (!active && this.markerActive !== null) {
                this.markerActive = null;
                change = true;
            }
            if (change) this.change();
        }
        if (!active && this.markEvent.observers.length) {
            this.mark(cursor);
        }
    }

    private onLoad(event: UIEvent): void {
        this.draw();
        this.afterinitEvent.emit(this);
    }

    private  onMousemove(event: MouseEvent): void {
        if (this.changeEvent.observers.length) {
            const cursor = this.cursor(event);
            var hover = false;
            var draw = false;
            this.markers.forEach((marker, index) => {
                if (this.insideMarker(marker, cursor)) {
                    hover = true;
                    if (this.markerHover === null || this.markerHover !== index) {
                        this.markerHover = index;
                        draw = true;
                    }
                }
            });
            if (!hover && this.markerHover !== null) {
                this.markerHover = null;
                draw = true;
            }
            if (draw) this.draw();
        }
    }

    private onMouseout(event: MouseEvent): void {
        if (this.markerHover) {
            this.markerHover = null;
            this.draw();
        }
    }

    private onResize(event: UIEvent): void {
        this.draw();
    }


}

export enum MarkerType {Shape, Composite}
export enum ShapeType {Circle, Square, None}

export class Marker
{
    x : number;
    y: number;
    type: MarkerType = MarkerType.Shape;
    base: ShapeType = ShapeType.Circle;
    size = 10;

    image = "";
    imageWidth: number = 0;
    imageHeight: number = 0;

    data: any = {};

    constructor(x, y, shape?:ShapeType)
    {
        this.x = x;
        this.y = y;
        if(shape)
        {
            this.base = shape;
        }
    }

    setsize (size: number){
        this.size = size;
    }



    /**
     * Convert a percentage position to a pixel position.
     */
    getCoordsAsPixel(img: ElementRef) {
        const image: HTMLImageElement = img.nativeElement;
        return [
            (image.clientWidth / 100) * this.x,
            (image.clientHeight / 100) * this.y,
        ];
    }

    setData(data:any):Marker{
        this.data = data;
        return this;
    }


    setAsComposite(image: string, base : ShapeType, width: number, height: number){
        this.image = image;
        this.type = MarkerType.Composite;
        this.base = base;

        this.imageWidth = width;
        this.imageHeight = height;
    }




}
