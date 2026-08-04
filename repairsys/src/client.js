import { mountApp } from './bootstrap';
import ClientApp from './ClientApp.vue';
import { clientRouter } from './client/router';

mountApp(ClientApp, [clientRouter]);
