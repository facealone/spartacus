import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { B2BApprovalProcess, B2BUnit } from '@spartacus/core';
import {
  B2BUnitNode,
  OrgUnitService,
} from '@spartacus/organization/administration/core';
import { Observable } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { CurrentItemService } from '../../shared/current-item.service';
import { ItemService } from '../../shared/item.service';
import { CurrentUnitService } from '../services/current-unit.service';
import { UnitItemService } from '../services/unit-item.service';

@Component({
  selector: 'cx-org-unit-form',
  templateUrl: './unit-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'content-wrapper' },
  providers: [
    {
      provide: ItemService,
      useExisting: UnitItemService,
    },
    {
      provide: CurrentItemService,
      useExisting: CurrentUnitService,
    },
  ],
})
export class UnitFormComponent implements OnInit {
  @Input() i18nRoot = 'orgUnit';

  @Input() createChildUnit = false;

  form$: Observable<any> = this.itemService.unit$.pipe(
    map((unit) => {
      const form = this.itemService.getForm();
      form.get('parentOrgUnit.uid')?.setValue(unit);
      if (this.createChildUnit) {
        form.get('parentOrgUnit')?.disable();
      }
      return form;
    })
  );

  units$: Observable<B2BUnitNode[]> = this.form$.pipe(
    switchMap((form) =>
      this.unitService
        .getActiveUnitList()
        .pipe(
          map((units) => units.filter((unit) => unit.id !== form?.value.uid))
        )
    )
  );

  approvalProcess$: Observable<
    B2BApprovalProcess[]
  > = this.unitService
    .getApprovalProcesses()
    .pipe(filter((items) => items?.length > 0));

  constructor(
    protected itemService: ItemService<B2BUnit>,
    protected unitService: OrgUnitService
  ) {}

  ngOnInit(): void {
    this.unitService.loadList();
  }
}
