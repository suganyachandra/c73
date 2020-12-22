import React from 'react';
import { Text, View, TouchableOpacity, TextInput, Image, StyleSheet,KeyboardAvoidingView,Alert,ToastAndroid  } from 'react-native';
import * as Permissions from 'expo-permissions';
import { BarCodeScanner } from 'expo-barcode-scanner';
import firebase from 'firebase';
import db from '../config';

export default class TransactionScreen extends React.Component {
    constructor(){
      super();
      this.state = {
        hasCameraPermissions: null,
        scanned: false,
        scannedBookId: '',
        scannedStudentId:'',
        buttonState: 'normal'
      }
    }

    getCameraPermissions = async (id) =>{
      const {status} = await Permissions.askAsync(Permissions.CAMERA);
      
      this.setState({
        /*status === "granted" is true when user has granted permission
          status === "granted" is false when user has not granted the permission
        */
        hasCameraPermissions: status === "granted",
        buttonState: id,
        scanned: false
      });
    }

    handleBarCodeScanned = async({type, data})=>{
      const {buttonState} = this.state

      if(buttonState==="BookId"){
        this.setState({
          scanned: true,
          scannedBookId: data,
          buttonState: 'normal'
        });
      }
      else if(buttonState==="StudentId"){
        this.setState({
          scanned: true,
          scannedStudentId: data,
          buttonState: 'normal'
        });
      }
      
    }

    initiateBookIssue = async ()=>{
      //add a transaction
      db.collection("transaction").add({
        'studentId' : this.state.scannedStudentId,//this.state.scannedStudentId -STG06A12
        'bookId' :this.state.scannedBookId,//this.state.scannedBookId-BSC001
        'data' : firebase.firestore.Timestamp.now().toDate(),
        'transactionType' : "Issue"
      })
  
      //change book status
      db.collection("books").doc(this.state.scannedBookId).update({
        'bookAvailability' : false
      })
      //change number of issued books for student
      db.collection("students").doc(this.state.scannedStudentId).update({
        'numberOfBooksIssued' : firebase.firestore.FieldValue.increment(1)
      })
  
      this.setState({
        scannedStudentId : '',
        scannedBookId: ''
      })
    }

    initiateBookReturn = async ()=>{
      //add a transaction
      db.collection("transaction").add({
        'studentId' : this.state.scannedStudentId,//this.state.scannedStudentId
        'bookId' : this.state.scannedBookId,//this.state.scannedBookId
        'date'   : firebase.firestore.Timestamp.now().toDate(),
        'transactionType' : "Return"
      })
  
      //change book status
      db.collection("books").doc(this.state.scannedBookId).update({
        'bookAvailability' : true
      })
  
      //change book status
      db.collection("students").doc(this.state.scannedStudentId).update({
        'numberOfBooksIssued' : firebase.firestore.FieldValue.increment(-1)
      })
  
      this.setState({
        scannedStudentId : '',
        scannedBookId : ''
      })
    }

    checkBookEligibility = async () => {
      const bookRef = await db
        .collection("books")
        .where("bookId", "==", this.state.scannedBookId)
        .get();
      var transactionType = "";
      console.log(this.state.scannedBookId);
      console.log(bookRef.docs);
      if (bookRef.docs.length == 0) {
        transactionType = false;
      } else {
        bookRef.docs.map(doc => {
          var book = doc.data();
          if (book.bookAvailability) {
            transactionType = "Issue";
          } else {
            transactionType = "Return";
          }
        });
      }
  
      return transactionType;
    };

    handleTransaction = async()=>{
      var transactionMessage = null;
      //BSC001-this.state.scannedBookId
      var transactionType=await this.checkBookEligibility();
      console.log("Transaction Type",transactionType);

      if(!transactionType){
        //Alert.alert("The book does not exists in the library database");
        console.log("The book does not exists in the library database")
        this.setState(
          {scannedBookId:'',
           scannedStudentId:''});
      }
      else if(transactionType==="Issue"){
        var isStudentEligible=await this.checkStudentEligibilityForBookIssue();
        if(isStudentEligible){
          this.initiateBookIssue();
          //Alert.alert("Book issue to student");
          console.log("Book issue to student")
        }
      }
      else {
        console.log("got into return1")
        var isStudentEligible=await this.checkStudentEligibilityForReturn();
        if(isStudentEligible){
          console.log("got into return2")
          this.initiateBookReturn();
          //Alert.alert("Book return to library");
          console.log("Book return to library")
        }
        
      }
      /*db.collection("books").doc(this.state.scannedBookId).get()
      .then((doc)=>{
        console.log(doc.data());
        var book = doc.data()
        if(book.bookAvailability){
          this.initiateBookIssue();
          transactionMessage = "Book Issued"
         // ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
           //Alert.alert(transactionMessage)
        }
        else{
          this.initiateBookReturn();
          transactionMessage = "Book Returned"
         // ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
          // Alert.alert(transactionMessage)
        }
      })
  
      this.setState({
        transactionMessage : transactionMessage
      })*/
    }

    checkStudentEligibilityForBookIssue = async () => {
      const studentRef = await db
        .collection("students")
        .where("studentId", "==", this.state.scannedStudentId)
        .get();
      var isStudentEligible = "";
      if (studentRef.docs.length == 0) {
        this.setState({
          scannedStudentId: "",
          scannedBookId: ""
        });
        isStudentEligible = false;
        Alert.alert("The student id doesn't exist in the database!");
      } else {
        studentRef.docs.map(doc => {
          var student = doc.data();
          if (student.numberOfBooksIssued < 2) {
            isStudentEligible = true;
          } else {
            isStudentEligible = false;
            Alert.alert("The student has already issued 2 books!");
            this.setState({
              scannedStudentId: "",
              scannedBookId: ""
            });
          }
        });
      }
  
      return isStudentEligible;
    };
  
    checkStudentEligibilityForReturn = async () => {
      console.log("got into return3")
      const transactionRef = await db
        .collection("transaction")
        .where("bookId", "==", this.state.scannedBookId)
        .limit(1)
        .get();
      var isStudentEligible = "";
      transactionRef.docs.map(doc => {
        var lastBookTransaction = doc.data();
        if (lastBookTransaction.studentId === this.state.scannedStudentId) {
          isStudentEligible = true;
        } else {
          isStudentEligible = false;
          console.log("student not eligible to return");
          Alert.alert("The book wasn't issued by this student!");
          this.setState({
            scannedStudentId: "",
            scannedBookId: ""
          });
        }
      });
      console.log("got into 4==="+isStudentEligible)
      return isStudentEligible;
    };
  
    render() {
      
      const hasCameraPermissions = this.state.hasCameraPermissions;
      const scanned = this.state.scanned;
      const buttonState = this.state.buttonState;

      if (buttonState !== "normal" && hasCameraPermissions){
        return(
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        );
      }

      else if (buttonState === "normal"){
        return(
          <KeyboardAvoidingView  style={styles.container} behavior="padding" enabled>
            <View>
              <Image
                source={require("../assets/booklogo.jpg")}
                style={{width:200, height: 200}}/>
              <Text style={{textAlign: 'center', fontSize: 30}}>Wily</Text>
            </View>
            <View style={styles.inputView}>
            <TextInput 
              style={styles.inputBox}
              placeholder="Book Id123"
              onChangeText={text =>this.setState({scannedBookId:text})}
              value={this.state.scannedBookId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("BookId")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>
            <View style={styles.inputView}>
            <TextInput 
              style={styles.inputBox}
              placeholder="Student Id"
              onChangeText ={text => this.setState({scannedStudentId:text})}
              value={this.state.scannedStudentId}/>
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={()=>{
                this.getCameraPermissions("StudentId")
              }}>
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
            </View>

            <TouchableOpacity
             style={styles.submitButton}
             onPress={async()=>{
             var transactionMessage = await this.handleTransaction();
            /* this.setState(
              {scannedBookId:'',
               scannedStudentId:''})*/
             }}>
                <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
            </KeyboardAvoidingView>
          
        );
      }
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    },
    displayText:{
      fontSize: 15,
      textDecorationLine: 'underline'
    },
    scanButton:{
      backgroundColor: '#2196F3',
      padding: 10,
      margin: 10
    },
    buttonText:{
      fontSize: 15,
      textAlign: 'center',
      marginTop: 10
    },
    inputView:{
      flexDirection: 'row',
      margin: 20
    },
    inputBox:{
      width: 200,
      height: 40,
      borderWidth: 1.5,
      borderRightWidth: 0,
      fontSize: 20
    },
    scanButton:{
      backgroundColor: '#66BB6A',
      width: 50,
      borderWidth: 1.5,
      borderLeftWidth: 0
    },
    submitButton:{
      backgroundColor: '#FBC02D',
      width: 100,
      height:50
    },
    submitButtonText:{
      padding: 10,
      textAlign: 'center',
      fontSize: 20,
      fontWeight:"bold",
      color: 'white'
    }
  });