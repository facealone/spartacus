import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { filter, map, switchMap, take, tap } from 'rxjs/operators';
import { BaseSite } from '../../model/misc.model';
import { getContextParameterDefault } from '../config/context-config-utils';
import { SiteContextConfig } from '../config/site-context-config';
import { BASE_SITE_CONTEXT_ID } from '../providers/context-ids';
import { SiteContextActions } from '../store/actions/index';
import { SiteContextSelectors } from '../store/selectors/index';
import { StateWithSiteContext } from '../store/state';
import { SiteContext } from './site-context.interface';

@Injectable()
// handle breaking change in #9601
export class BaseSiteService implements SiteContext<BaseSite> {
  constructor(
    protected store: Store<StateWithSiteContext>,
    protected config: SiteContextConfig
  ) {}

  /**
   * Represents the current baseSite uid.
   */
  getActive(): Observable<string> {
    return this.store.pipe(
      select(SiteContextSelectors.getActiveBaseSite),
      filter((active) => Boolean(active))
    );
  }

  /**
   * Get all base sites data
   */
  // handle breaking change in #9601
  getAll(): Observable<BaseSite[]> {
    return this.store.pipe(
      select(SiteContextSelectors.getAllBaseSites),
      tap((sites) => {
        if (!sites) {
          this.store.dispatch(new SiteContextActions.LoadBaseSites());
        }
      }),
      filter((sites) => Boolean(sites))
    );
  }

  /**
   * Get base site data based on site uid
   */
  get(siteUid?: string): Observable<BaseSite> {
    if (siteUid) {
      return this.getAll().pipe(
        map((sites) => sites.find((site) => site.uid === siteUid))
      );
    }

    return this.getActive().pipe(
      switchMap((activeSiteUid) =>
        this.getAll().pipe(
          map((sites) => sites.find((site) => site.uid === activeSiteUid))
        )
      )
    );
  }

  setActive(baseSite: string): Subscription {
    return this.store
      .pipe(select(SiteContextSelectors.getActiveBaseSite), take(1))
      .subscribe((activeBaseSite) => {
        if (baseSite && activeBaseSite !== baseSite) {
          this.store.dispatch(
            new SiteContextActions.SetActiveBaseSite(baseSite)
          );
        }
      });
  }

  /**
   * Initializes the active baseSite.
   */
  initialize(): void {
    let value;
    this.getActive()
      .subscribe((val) => (value = val))
      .unsubscribe();
    if (value) {
      // don't initialize, if there is already a value (i.e. retrieved from route or transferred from SSR)
      return;
    }

    this.setActive(
      getContextParameterDefault(this.config, BASE_SITE_CONTEXT_ID)
    );
  }

  /**
   * @deprecated since 3.0, use function get() instead
   * handle breaking change in #9601
   */
  getBaseSiteData(): Observable<BaseSite> {
    return this.store.pipe(
      select(SiteContextSelectors.getBaseSiteData),
      tap((baseSite) => {
        if (Object.keys(baseSite).length === 0) {
          this.store.dispatch(new SiteContextActions.LoadBaseSite());
        }
      })
    );
  }
}
