import React, {Component} from 'react';
import {
  Table,
  TableBody,
  TableFooter,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table';
import CircularProgress from 'material-ui/CircularProgress'
import TextField from 'material-ui/TextField';
import Toggle from 'material-ui/Toggle';
import Paper from 'material-ui/Paper'
import {tableData} from './data'
import RaisedButton from 'material-ui/RaisedButton'
import {hashHistory} from 'react-router'
import {connect} from 'react-redux'
import {firebaseDB} from '../../../firebaseConfig'
import SearchSortContainer from './SearchSortContainer'
import Dialogxx from '../../Dialogs/ViewEventDialogComponent'
import FlagDialog from '../../Dialogs/FlagDialog'
import Snackbar from 'material-ui/Snackbar';
import {approveEvent, flagRejectEvent} from '../../../Services/firebaseDBService'

class FA_MyEventsComponent extends Component {
  constructor(props) {
    super(props)
    this.approve = this.approve.bind(this)
    this.flagReject = this.flagReject.bind(this)
    this.flagRejectConfirm = this.flagRejectConfirm.bind(this)
    this.showDialog = this.showDialog.bind(this)
    this.handleDialogClose = this.handleDialogClose.bind(this)
    this.handleSnackBarClose = this.handleSnackBarClose.bind(this)
    this.handleFlagDialogClose = this.handleFlagDialogClose.bind(this)
    this.nextEvent = this.nextEvent.bind(this);
    this.handleSearch = this.handleSearch.bind(this)

    this.state = {
      fixedHeader: true,
      fixedFooter: false,
      stripedRows: false,
      showRowHover: true,
      showCheckboxes: false,
      myArr: {},
      myArrx: {},
      allArr: {},
      originalArr: {},
      pendingArr: {},
      approvedArr: {},
      SnackBarmessage: '',
      openSnackBar: false,
      autoHideDuration: 3000,
      dialogOpen: false,
      FlagDialogOpen: false,
      currentEvent: {}
    }
}

  handleSearch(content) {
    this.setState({searchContent: content})
    var myArrx = this.state.originalArr
    myArrx = Object.values(myArrx).filter(_event => _event.title.toLowerCase().includes(content.toLowerCase()));
    this.setState({myArrx})
  }

  showDialog(event) {
    this.setState({dialogOpen: true})
    this.setState({currentEvent: event})
  }
  
  approve(event) {
    let scope = this;
    approveEvent(event, 'FA', this.props.user)
    const {myArrx} = scope.state
    delete myArrx[event.key]
    scope.setState({myArrx})
    scope.setState({SnackBarmessage: 'Event successfully approved', openSnackBar: true})
    this.nextEvent()
  }

  flagRejectConfirm(event, mode) {
    this.setState({FlagDialogOpen: true})
    this.setState({currentEvent: event})
    this.setState({flagRejectMode: mode})
  }

  flagReject(event, message, mode) {
    let scope = this;
    flagRejectEvent(event, message, mode, 'FA', this.props.user)
    const {myArrx} = scope.state
    delete myArrx[event.key]
    scope.setState({myArrx})
    scope.setState({SnackBarmessage: 'Event successfully flagged', openSnackBar: true})
    this.setState({FlagDialogOpen: false})
    this.nextEvent()
  }
  
  handleDialogClose() {
    this.setState({dialogOpen: false})
  }

  handleSnackBarClose() {
    this.setState({openSnackBar: false}) 
  }

  handleFlagDialogClose() { this.setState({FlagDialogOpen: false}) }

  nextEvent() {
    let keys = Object.keys(this.state.myArrx)
    if(keys.length == 0){
      this.handleDialogClose()
      return
    }
    let pos = keys.indexOf(this.state.currentEvent.key) + 1
    if(pos == Object.keys(this.state.myArrx).length){
      pos = 0;
    }
    let nextKey = keys[pos]
    let nextEvent = this.state.myArrx[nextKey]
    this.setState({currentEvent: nextEvent})
  }

  filterAndStore(arr) {
    for(let [key, value] of Object.entries(arr)) {
      var x = key
      if(value.FA_appr && value.AD_appr && value.SO_appr) {
        this.state.approvedArr[key] = value
      }
      else if(!value.FA_appr || !value.AD_appr || !value.SO_appr) {
        this.state.pendingArr[key] = value
      }
      this.state.allArr[key] = value
    }
  }

  componentWillReceiveProps(newProps) {
    if(newProps.filter == 'pending'){
      const {pendingArr} = this.state
      this.setState({myArr: pendingArr})
    }
    else if(newProps.filter == 'approved') {
      const {approvedArr} = this.state
      this.setState({myArr: approvedArr})
    }
    else if(newProps.filter == 'all') {
      const {allArr} = this.state
      this.setState({myArr: allArr})
    }
  }

  
  componentDidMount() {
    if(!this.props.user){
      hashHistory.push('/dashboard')
      return
    }
    this.setState({fetching: true})
    
    firebaseDB.ref('/clubs/' + this.props.user.clubId).on('value',
    function(snapshot) {
      this.setState({fetching: false})
      let events = snapshot.val().my_events
      for(let event in events) {
        firebaseDB.ref('events/' + events[event]).on('value',
        function(snapshot) {
          if(snapshot.val().FA_appr == 'pending') {
            const {myArrx} = this.state
            myArrx[snapshot.key] = snapshot.val()
            myArrx[snapshot.key].key = snapshot.key
            this.setState({myArrx})
            this.setState({originalArr: myArrx})
            this.filterAndStore(myArrx)
          }
        }, this)
      }
    }, this)
  }

  render() {

    return (
      <div style={{display: 'flex', justifyContent: 'start', flexDirection: 'column', alignItems: 'center', backgroundColor: '', height: '100%'}}>

      <div style={{minWidth: '98%', backgroundColor: '', marginTop: 20}}>
        <SearchSortContainer allLength={Object.keys(this.state.allArr).length} approvedLength={Object.keys(this.state.approvedArr).length} pendingLength={Object.keys(this.state.pendingArr).length} handleSearch={this.handleSearch} />
      </div>
      
      <Snackbar
          open={this.state.openSnackBar}
          message={this.state.SnackBarmessage}
          autoHideDuration={this.state.autoHideDuration}
          onRequestClose={this.handleSnackBarClose}
        />

      <Dialogxx open={this.state.dialogOpen} currentEvent={this.state.currentEvent} handleClose={this.handleDialogClose} nextEvent={this.nextEvent} approveHandler={this.approve} rejectHandler={this.reject} flagRejectHandler={this.flagRejectConfirm}/>

      <FlagDialog open={this.state.FlagDialogOpen} currentEvent={this.state.currentEvent} handleClose={this.handleFlagDialogClose} mode={this.state.flagRejectMode} flagRejectHandler={this.flagReject} />

      <Paper style={{width: '98%', height: 500, overflow: 'hidden'}} zDepth={2}>
        <Table
          style={{backgroundColor: ''}}
          height={'440px'}
          fixedHeader={this.state.fixedHeader}
          fixedFooter={this.state.fixedFooter}
          selectable={this.state.selectable}
          multiSelectable={this.state.multiSelectable}
        >
          <TableHeader
            displaySelectAll={this.state.showCheckboxes}
            adjustForCheckbox={this.state.showCheckboxes}
            enableSelectAll={this.state.enableSelectAll}
          >
            <TableRow style={{backgroundColor: '#EFF0F2'}}>
              <TableHeaderColumn style={{color: '#000', fontWeight: 700}}>TITLE</TableHeaderColumn>
              <TableHeaderColumn style={{color: '#000', fontWeight: 700}}>START DATE</TableHeaderColumn>
              <TableHeaderColumn style={{color: '#000', fontWeight: 700}} hidden={this.props.isMobile}>END DATE</TableHeaderColumn>
              <TableHeaderColumn style={{color: '#000', fontWeight: 700}}>ACTIONS</TableHeaderColumn>
            </TableRow>
          </TableHeader>
          <TableBody
            displayRowCheckbox={this.state.showCheckboxes}
            deselectOnClickaway={this.state.deselectOnClickaway}
            showRowHover={this.state.showRowHover}
            stripedRows={this.state.stripedRows}
          >

          {this.state.fetching && <CircularProgress />}

          { Object.keys(this.state.myArrx).length > 0 ? (Object.values(this.state.myArrx).map(function(event, index) {
            return(
                  <TableRow key={index}>
                    <TableRowColumn>{event.title}</TableRowColumn>
                    <TableRowColumn>{event.start_date}</TableRowColumn>
                    <TableRowColumn hidden={this.props.isMobile}>{event.end_date}</TableRowColumn>
                    <TableRowColumn>{<div><RaisedButton label="View" primary={true} style={{marginRight: 10}} onClick={() => this.showDialog(event)}/><RaisedButton hidden={this.props.isMobile} label="Approve" primary={true} onClick={() => this.approve(event)}/></div>}</TableRowColumn>
                  </TableRow>
            )}, this)) : <p style={{textAlign: 'center', fontSize: '3rem'}}>NO EVENTS PENDING</p>
          }
          
          </TableBody>
        </Table>
        </Paper>
      </div>
    );
  }
}

function mapStateToProps(state) {
  const {openSideNav, isMobile, filter} = state.toggler
  const {user, verified, vals} = state.authentication
  return {
    user,
    openSideNav,
    verified,
    isMobile,
    vals,
    filter
  }
}

export default connect(mapStateToProps)(FA_MyEventsComponent)