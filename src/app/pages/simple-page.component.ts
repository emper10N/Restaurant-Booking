import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-simple-page',
  standalone: true,
  template: `
    <section class="page">
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </section>
  `,
  styles: [
    `
      .page {
        padding: 1rem;
        background: #fff;
        border-radius: 8px;
      }
    `,
  ],
})
export class SimplePageComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] ?? 'Раздел';
  readonly description =
    this.route.snapshot.data['description'] ??
    'Каркас раздела готов, можно подключать таблицы и CRUD-формы по API.';
}
