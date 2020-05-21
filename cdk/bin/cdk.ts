#!/usr/bin/env node
import 'source-map-support/register'
import {App} from '@aws-cdk/core'
import { BillowCatalogStack } from '../lib/billow-catalog-stack'

const app = new App()
new BillowCatalogStack(app, 'BillowCatalog')
