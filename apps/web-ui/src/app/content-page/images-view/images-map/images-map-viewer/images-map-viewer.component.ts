import {
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import * as tilebelt from '@mapbox/tilebelt';
import { Store } from '@ngrx/store';
import range from 'lodash/range';
import * as mapboxgl from 'mapbox-gl';
import { Subscription } from 'rxjs';
import Supercluster from 'supercluster';

import { MAPBOX_FACTORY_TOKEN } from '../../../../app.tokens';
import { authState } from '../../../../auth/store';
import { MediaViewerRequest } from '../../../media-viewer/media-viewer.request';
import { Heatmap } from '../../../services/web-api/types/heatmap';
import { dialogsActions } from '../../../store/dialogs';
import { ImageMapMarkerComponent } from './image-map-marker/image-map-marker.component';

export interface TileId {
  x: number;
  y: number;
  z: number;
}

const HEATMAP_SOURCE_ID = 'media-heatmap';
const HEATMAP_LAYER_ID = 'heatmap-layer';

const TILES_SOURCE_ID = 'tile-grid';
const TILES_FILL_LAYER_ID = 'tile-grid-fill';
const TILES_OUTLINE_LAYER_ID = 'tile-grid-outline';

@Component({
  selector: 'app-images-map-viewer',
  templateUrl: './images-map-viewer.component.html',
  styleUrls: ['./images-map-viewer.component.scss'],
  standalone: true,
})
export class ImagesMapViewerComponent implements OnInit, OnDestroy {
  readonly heatmap = input.required<Heatmap>();
  readonly isDarkMode = input<boolean>(false);
  readonly showMarkers = input<boolean>(true);
  readonly showHeatmap = input<boolean>(true);
  readonly showTiles = input<boolean>(true);

  readonly visibleTilesChanged = output<TileId[]>();

  private readonly heatmap$ = toObservable(this.heatmap);
  private readonly isDarkMode$ = toObservable(this.isDarkMode);
  private readonly showMarkers$ = toObservable(this.showMarkers);
  private readonly showHeatmap$ = toObservable(this.showHeatmap);
  private readonly showTiles$ = toObservable(this.showTiles);

  private readonly subscriptions = new Subscription();

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly store = inject(Store);
  private readonly mapboxFactory = inject(MAPBOX_FACTORY_TOKEN);
  private readonly mapboxApiToken = this.store.selectSignal(
    authState.selectMapboxApiToken,
  );

  private map!: mapboxgl.Map;
  private heatmapGeoJson!: GeoJSON.GeoJSON;
  private supercluster!: Supercluster;
  private imageMarkers: mapboxgl.Marker[] = [];
  private tilesGeoJson!: GeoJSON.GeoJSON;

  ngOnInit() {
    this.map = this.mapboxFactory.buildMap({
      accessToken: this.mapboxApiToken(),
      container: this.mapContainer.nativeElement,
      style: getTheme(this.isDarkMode()),
      maxZoom: 22,
    });

    // Set the map layers whenever it has finished loading
    this.map.on('load', () => {
      this.prepareTileLayer();
      this.updateTileGridLayer(this.showTiles());
      this.prepareHeatmapLayer();
      this.updateHeatmapLayer(this.showHeatmap());
      this.prepareSupercluster();
      this.updateImageMarkers(this.showMarkers());
      this.emitVisibleTiles();

      this.subscriptions.add(
        this.isDarkMode$.subscribe((isDarkMode) => {
          this.map.setStyle(getTheme(isDarkMode));

          // Update the map when style changes
          this.map.once('styledata', () => {
            this.updateTileGridLayer(this.showTiles());
            this.updateHeatmapLayer(this.showHeatmap());
            this.updateImageMarkers(this.showMarkers());
          });
        }),
      );

      this.subscriptions.add(
        this.heatmap$.subscribe(() => {
          this.prepareHeatmapLayer();
          this.updateHeatmapLayer(this.showHeatmap());
          this.prepareSupercluster();
          this.updateImageMarkers(this.showMarkers());
        }),
      );

      this.subscriptions.add(
        this.showMarkers$.subscribe((showMarkers) => {
          this.updateImageMarkers(showMarkers);
        }),
      );

      this.subscriptions.add(
        this.showHeatmap$.subscribe((showHeatmap) => {
          this.updateHeatmapLayer(showHeatmap);
        }),
      );

      this.subscriptions.add(
        this.showTiles$.subscribe((showTiles) => {
          this.updateTileGridLayer(showTiles);
        }),
      );
    });

    // Update the map whenever the map has moved
    this.map.on('moveend', () => {
      this.prepareTileLayer();
      this.updateTileGridLayer(this.showTiles());
      this.emitVisibleTiles();
    });
  }

  private prepareTileLayer() {
    this.tilesGeoJson = {
      type: 'FeatureCollection',
      features: this.getVisibleTiles().map((tile) => ({
        type: 'Feature',
        geometry: tilebelt.tileToGeoJSON([tile.x, tile.y, tile.z]),
        properties: {},
      })),
    };
  }

  private updateTileGridLayer(showTiles: boolean) {
    if (!this.map.getSource(TILES_SOURCE_ID)) {
      this.map.addSource(TILES_SOURCE_ID, {
        type: 'geojson',
        data: this.tilesGeoJson,
      });

      // Fill layer for tile background
      this.map.addLayer({
        id: TILES_FILL_LAYER_ID,
        type: 'fill',
        source: TILES_SOURCE_ID,
        paint: {
          'fill-color': ['rgba', 255, 255, 255, 0.1], // white, 10% opacity
          'fill-outline-color': '#000000',
        },
      });

      // Line layer for tile outlines
      this.map.addLayer({
        id: TILES_OUTLINE_LAYER_ID,
        type: 'line',
        source: TILES_SOURCE_ID,
        paint: {
          'line-color': '#ff0000',
          'line-width': 2,
        },
      });
    } else {
      // Update source data if it already exists
      (this.map.getSource(TILES_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
        this.tilesGeoJson,
      );
    }

    if (
      this.map.getLayer(TILES_FILL_LAYER_ID) &&
      this.map.getLayer(TILES_OUTLINE_LAYER_ID)
    ) {
      this.map.setLayoutProperty(
        TILES_FILL_LAYER_ID,
        'visibility',
        showTiles ? 'visible' : 'none',
      );
      this.map.setLayoutProperty(
        TILES_OUTLINE_LAYER_ID,
        'visibility',
        showTiles ? 'visible' : 'none',
      );
    }
  }

  private getVisibleTiles(): TileId[] {
    const bounds = this.map.getBounds();
    if (!bounds) {
      return [];
    }

    const zoom = Math.max(1, Math.floor(this.map.getZoom()));

    const north = clampLat(bounds.getNorth());
    const south = clampLat(bounds.getSouth());
    const east = clampLng(bounds.getEast());
    const west = clampLng(bounds.getWest());

    const [xTop, yTop] = tilebelt.pointToTile(west, north, zoom);
    const [xBottom, yBottom] = tilebelt.pointToTile(east, south, zoom);

    const xValues = range(xTop, xBottom + 1);
    const yValues = range(yTop, yBottom + 1);

    const seenTiles = new Set<string>();
    const tiles = [];

    for (const x of xValues) {
      for (const y of yValues) {
        const key = `${x}/${y}/${zoom}`;

        if (!seenTiles.has(key)) {
          tiles.push({ x, y, z: zoom });
          seenTiles.add(key);
        }
      }
    }

    return tiles;
  }

  private prepareSupercluster() {
    const geojsonPoints: Supercluster.PointFeature<{
      sampledMediaItemId: string;
      count: number;
    }>[] = this.heatmap().points.map((point) => {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          sampledMediaItemId: point.sampledMediaItemId,
          count: point.count,
        },
      };
    });

    this.supercluster = new Supercluster({
      radius: 60,
      maxZoom: this.map.getMaxZoom() - 1,
      map: (props) => {
        return {
          count: props['count'] as number,
        };
      },
      reduce: (accumulated, props) => {
        accumulated.count += props.count;
      },
    });
    this.supercluster.load(geojsonPoints);
  }

  private updateImageMarkers(showMarkers: boolean) {
    // Remove old markers
    this.imageMarkers.forEach((marker) => marker.remove());
    this.imageMarkers = [];

    // Get clusters for current viewport and zoom
    const bounds = this.map.getBounds();
    if (!showMarkers || !bounds || !this.supercluster) {
      return;
    }

    const bbox: GeoJSON.BBox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    const clusters = this.supercluster.getClusters(bbox, this.map.getZoom());

    for (const cluster of clusters) {
      const longitude = cluster.geometry.coordinates[0];
      const latitude = cluster.geometry.coordinates[1];

      let mediaItemId: string;
      let count: number;
      let expansionZoom: number;

      if (cluster.properties.cluster) {
        const leaf = this.supercluster.getLeaves(cluster.id as number, 1)[0];
        mediaItemId = leaf.properties['sampledMediaItemId'] as string;

        count = cluster.properties['count'] as number;
        expansionZoom = this.supercluster.getClusterExpansionZoom(
          cluster.id as number,
        );
      } else {
        mediaItemId = cluster.properties['sampledMediaItemId'] as string;
        count = cluster.properties['count'] as number;
        expansionZoom = this.map.getZoom() + 1;
      }

      const componentRef = this.viewContainerRef.createComponent(
        ImageMapMarkerComponent,
      );
      componentRef.setInput('mediaItemId', mediaItemId);
      componentRef.setInput('badgeCount', count);

      if (count === 1) {
        this.subscriptions.add(
          componentRef.instance.markerClick.subscribe(() => {
            this.store.dispatch(
              dialogsActions.openDialog({
                request: new MediaViewerRequest(mediaItemId),
              }),
            );
          }),
        );
      } else {
        this.subscriptions.add(
          componentRef.instance.markerClick.subscribe(() => {
            this.map.easeTo({
              center: [longitude, latitude],
              zoom: expansionZoom,
            });
          }),
        );
      }

      const marker = this.mapboxFactory
        .buildMarker(componentRef)
        .setLngLat([longitude, latitude])
        .addTo(this.map);

      this.imageMarkers.push(marker);
    }
  }

  private prepareHeatmapLayer() {
    this.heatmapGeoJson = {
      type: 'FeatureCollection',
      features: this.heatmap().points.map((entry) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [entry.longitude, entry.latitude],
        },
        properties: {
          count: entry.count,
        },
      })),
    };
  }

  private updateHeatmapLayer(showHeatmap: boolean) {
    // Add or update the source
    if (!this.map.getSource(HEATMAP_SOURCE_ID)) {
      this.map.addSource(HEATMAP_SOURCE_ID, {
        type: 'geojson',
        data: this.heatmapGeoJson,
      });

      // Add the heatmap layer
      this.map.addLayer({
        id: HEATMAP_LAYER_ID,
        type: 'heatmap',
        source: HEATMAP_SOURCE_ID,
        maxzoom: 22,
        paint: {
          // Customize heatmap style as you want
          'heatmap-weight': ['log10', ['+', ['get', 'count']]],
          'heatmap-intensity': 0.8,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(33,102,172,0)',
            0.2,
            'rgba(31, 101, 142, 1)',
            0.4,
            'rgb(209,229,240)',
            0.6,
            'rgb(253,219,199)',
            0.8,
            'rgb(239,138,98)',
            1,
            'rgb(178,24,43)',
          ],
          'heatmap-radius': 20,
          'heatmap-opacity': 0.8,
        },
      });
    } else {
      // Update the data if the source already exists
      const source = this.map.getSource(HEATMAP_SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;
      source?.setData(this.heatmapGeoJson);
    }

    if (this.map.getLayer(HEATMAP_LAYER_ID)) {
      this.map.setLayoutProperty(
        HEATMAP_LAYER_ID,
        'visibility',
        showHeatmap ? 'visible' : 'none',
      );
    }
  }

  private emitVisibleTiles() {
    const visibleTiles = this.getVisibleTiles();
    this.visibleTilesChanged.emit(visibleTiles);
  }

  ngOnDestroy() {
    this.map.remove();
    this.imageMarkers.forEach((marker) => marker.remove());
    this.subscriptions.unsubscribe();
  }
}

function getTheme(isDarkMode: boolean) {
  return isDarkMode
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/streets-v12';
}

/** Clamp the latitude value from -89.99999 to 89.99999 */
function clampLat(lat: number): number {
  return Math.max(-89.9999, Math.min(89.9999, lat));
}

/** Clamp the longitude value from -179.99999 to 179.99999 */
function clampLng(lng: number): number {
  return Math.max(-179.9999, Math.min(179.9999, lng));
}
