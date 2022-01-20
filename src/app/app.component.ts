import { Component } from '@angular/core';
import {RichiestaService} from './service/richiesta.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'testResponse';

  constructor(
    readonly service: RichiestaService
  ) {
    // service.richiesta('getRegistrazione').subscribe(console.dir);
    // service.richiestaFor('getRegistrazione', 'getRegistrazioneUno', false, 'dto', 'dati-completi-oe').subscribe(console.dir);
    service.richiestaFor('dichiarazione', 'dichiarazione2', true).subscribe(console.dir);
  }
}
