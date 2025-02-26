import * as React from 'react';

import type { IGymUserdashboardProps } from './IGymUserdashboardProps';
import Dashboard from './Dashboard';

export default class GymUserdashboard extends React.Component<IGymUserdashboardProps> {
  public render(): React.ReactElement<IGymUserdashboardProps> {
    const {
    
    } = this.props;

    return (
      <div>
        <Dashboard/>

      </div>
    );
  }
}
