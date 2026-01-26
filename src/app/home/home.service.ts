import { effect, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  map,
  Observable,
  shareReplay,
  Subscription,
  tap,
  throwError,
} from 'rxjs';
import { HomeElementModel } from '../shared/page.element/page.element.model';
import { HttpClient } from '@angular/common/http';
import { AUTH_CREDENTIALS } from '../secrets';
import { AuthService } from '../auth/auth.service';
import { HomeElementResponse } from './responses/home.element.resp';
import { SettingsService } from '../settings/settings.service';
import { ToastService } from '../shared/services/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly toastService = inject(ToastService);
  private readonly translateService = inject(TranslateService);
  private homeElementsSub = Subscription.EMPTY;
  public readonly homeElements = signal<HomeElementModel | null>(null);

  private readonly pageElementsApi = new URL(
    `/api/mobile_app_manager/page_elements/v1`,
    AUTH_CREDENTIALS.app_url,
  ).toString();

  constructor() {
    effect(() => {
      const language = this.settingsService.selectedLanguage$();
      if (language) {
        this.homeElementsSub.unsubscribe();
        this.homeElementsSub = this.getHomeElements(language).subscribe();
      }
    });
  }

  getHomeElements(language: string): Observable<HomeElementModel> {
    try {
      return this.http
        .get<HomeElementResponse[]>(this.pageElementsApi, {
          params: { language },
        })
        .pipe(
          map((response: HomeElementResponse[]) => {
            const headerElementResponse = response.find(
              (element) => element['2(element_type)']?.code === 'header',
            );
            const trackingElementResponse = response.find(
              (element) => element['2(element_type)']?.code === 'tracking',
            );
            const newsElementsResponse = response.find(
              (element) => element['2(element_type)']?.code === 'news',
            );
            const infoResponses = response.filter(
              (element) => element['2(element_type)']?.code === 'info',
            );
            const contentImageResponses = response.filter(
              (element) => element['2(element_type)']?.code === 'content_image',
            );
            const countdownTimerResponses = response.filter(
              (element) =>
                element['2(element_type)']?.code === 'countdown_timer',
            );
            return {
              headerElementModel: headerElementResponse
                ? {
                    mainImage: headerElementResponse['0(page_element)']
                      .primary_image
                      ? new URL(
                          `/data/download/${
                            headerElementResponse['0(page_element)']
                              .primary_image[0].name
                          }?attribute_id=cc6d340b-2728-4bdb-95c3-90feb97dbcb2&file_id=${
                            headerElementResponse['0(page_element)']
                              .primary_image[0].id
                          }&version=0&token=${this.authService.getToken()}`,
                          AUTH_CREDENTIALS.app_url,
                        ).toString()
                      : null,
                    mainImagePosition:
                      headerElementResponse['3(image_position)'].code,
                    mainImageWidth: `${
                      headerElementResponse['0(page_element)']
                        .primary_image_width ?? '0'
                    }%`,
                    secondaryImage: headerElementResponse['0(page_element)']
                      .secondary_image
                      ? new URL(
                          `/data/download/${
                            headerElementResponse['0(page_element)']
                              .secondary_image[0].name
                          }?attribute_id=45d68dae-2bf7-475a-9b92-35f7a9899912&file_id=${
                            headerElementResponse['0(page_element)']
                              .secondary_image[0].id
                          }&version=0&token=${this.authService.getToken()}`,
                          AUTH_CREDENTIALS.app_url,
                        ).toString()
                      : null,
                    secondaryImageWidth: `${
                      headerElementResponse['0(page_element)']
                        .secondary_image_width ?? '0'
                    }%`,
                  }
                : null,
              trackingElementModel: trackingElementResponse
                ? {
                    type: 'tracking',
                    order: trackingElementResponse?.['0(page_element)'].order,
                    title: trackingElementResponse?.['0(page_element)'].title,
                    subtitle:
                      trackingElementResponse?.['0(page_element)'].subtitle,
                    backgroundColor: trackingElementResponse?.[
                      '0(page_element)'
                    ].background_color
                      ? `#${trackingElementResponse?.['0(page_element)'].background_color}`
                      : null,
                    textColor: trackingElementResponse?.['0(page_element)']
                      .text_color
                      ? `#${trackingElementResponse?.['0(page_element)'].text_color}`
                      : null,
                    backgroundImage: trackingElementResponse?.[
                      '0(page_element)'
                    ].primary_image
                      ? new URL(
                          `/data/download/${
                            trackingElementResponse['0(page_element)']
                              .primary_image[0].name
                          }?attribute_id=cc6d340b-2728-4bdb-95c3-90feb97dbcb2&file_id=${
                            trackingElementResponse['0(page_element)']
                              .primary_image[0].id
                          }&version=0&token=${this.authService.getToken()}`,
                          AUTH_CREDENTIALS.app_url,
                        ).toString()
                      : null,
                    icon: 'https://unpkg.com/ionicons/dist/svg/analytics-outline.svg',
                    link: trackingElementResponse?.['0(page_element)'].url,
                    opens_in_external_url:
                      trackingElementResponse?.['0(page_element)']
                        .opens_external_url,
                  }
                : null,
              newsElementModel: newsElementsResponse
                ? {
                    type: 'news',
                    order: newsElementsResponse['0(page_element)'].order,
                    title: newsElementsResponse['0(page_element)'].title,
                    subtitle: newsElementsResponse['0(page_element)'].subtitle,
                    backgroundColor: newsElementsResponse['0(page_element)']
                      .background_color
                      ? `#${newsElementsResponse['0(page_element)'].background_color}`
                      : null,
                    textColor: newsElementsResponse['0(page_element)']
                      .text_color
                      ? `#${newsElementsResponse['0(page_element)'].text_color}`
                      : null,
                    backgroundImage: newsElementsResponse['0(page_element)']
                      .primary_image
                      ? new URL(
                          `/data/download/${
                            newsElementsResponse['0(page_element)']
                              .primary_image[0].name
                          }?attribute_id=cc6d340b-2728-4bdb-95c3-90feb97dbcb2&file_id=${
                            newsElementsResponse['0(page_element)']
                              .primary_image[0].id
                          }&version=0&token=${this.authService.getToken()}`,
                          AUTH_CREDENTIALS.app_url,
                        ).toString()
                      : null,
                    icon: 'https://unpkg.com/ionicons/dist/svg/analytics-outline.svg',
                  }
                : null,
              infoParentElementModel:
                infoResponses.length > 0
                  ? {
                      type: 'info',
                      order: infoResponses[0]['0(page_element)'].order,
                      infoChildElements: infoResponses.map((infoResponse) => ({
                        id: infoResponse['0(page_element)'].id,
                        link: infoResponse['0(page_element)'].url,
                        title: infoResponse['0(page_element)'].title,
                        subtitle: infoResponse['0(page_element)'].subtitle,
                        opens_in_external_url:
                          infoResponse['0(page_element)'].opens_external_url,
                        backgroundColor: infoResponse['0(page_element)']
                          .background_color
                          ? `#${infoResponse['0(page_element)'].background_color}`
                          : null,
                        textColor: infoResponse['0(page_element)'].text_color
                          ? `#${infoResponse['0(page_element)'].text_color}`
                          : null,
                      })),
                    }
                  : null,
              countdownTimerElementModels:
                countdownTimerResponses.length > 0
                  ? countdownTimerResponses.map((response) => {
                      return {
                        order: response['0(page_element)'].order,
                        type: 'countdowntimer',
                        id: response['0(page_element)'].id,
                        targetDateTime: response['0(page_element)'].timer
                          ? new Date(response['0(page_element)'].timer * 1000)
                          : new Date(0),

                        backgroundColor: response['0(page_element)']
                          .background_color
                          ? `#${response['0(page_element)'].background_color}`
                          : null,
                        textColor: response['0(page_element)'].text_color
                          ? `#${response['0(page_element)'].text_color}`
                          : null,
                        title: response['0(page_element)'].title,
                      };
                    })
                  : null,
              contentImageElementModels:
                contentImageResponses.length > 0
                  ? contentImageResponses.map((response) => {
                      return {
                        id: response['0(page_element)'].id,
                        order: response['0(page_element)'].order,
                        type: 'contentimage',
                        imageUrl: response?.['0(page_element)'].primary_image
                          ? new URL(
                              `/data/download/${
                                response['0(page_element)'].primary_image[0]
                                  .name
                              }?attribute_id=cc6d340b-2728-4bdb-95c3-90feb97dbcb2&file_id=${
                                response['0(page_element)'].primary_image[0].id
                              }&version=0&token=${this.authService.getToken()}`,
                              AUTH_CREDENTIALS.app_url,
                            ).toString()
                          : null,
                        altText: response['0(page_element)'].title,
                        linkUrl: response['0(page_element)'].url,
                      };
                    })
                  : null,
            } as HomeElementModel;
          }),
          tap((homeElements: HomeElementModel) => {
            this.homeElements.set(homeElements);
          }),
          shareReplay({ bufferSize: 1, refCount: true }),
          catchError((error) => {
            const errorMessage = this.translateService.instant(
              'HOME.ERRORS.FAILED_TO_LOAD_HOME_ELEMENTS',
            );
            this.toastService.showError(errorMessage);
            return throwError(() => error);
          }),
        );
    } catch (error) {
      console.error('Error in getHomeElements:', error);
      throw error;
    }
  }
}
