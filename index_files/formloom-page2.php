<?php
session_start();
//=====================================================//
//
// ! YABDAB - FORMLOOM VERSION 3.0.9 (140)
// - AUTHOR: Mike Yrabedra
// - MODIFIED: 02-02-2016 08:51:11am
// - (c)2016 Yabdab Inc. All rights reserved.
//
// - PUBLISHED: 2016-07-24 03:53:17 +0000
//
//=====================================================//

//SMTP needs accurate times, and the PHP time zone MUST be set
//This should be done in your php.ini, but this is how to do it if you don't have access to that
if(ini_get('date.timezone') == '') date_default_timezone_set('GMT');

//=============================================================//
// ! - ENABLE DEBUGGING
//=============================================================//

$debug_enabled = false; // true or false

// Turn Errors On
if($debug_enabled) {
    @error_reporting(E_ERROR | E_WARNING | E_PARSE);
    @ini_set('display_errors', 1);
}else{
    @error_reporting(E_ERROR);
}

//=============================================================//
// ! - CONFIGURE SETTINGS
//=============================================================//

// ! -- GENERAL
$fl['plugin'] 			= true; // tell class this is formloom
$fl['debug'] 			= false; // true or false
$fl['from_email'] 		= 'infor_issam@yahoo.fr';
$fl['from_name'] 		= html_entity_decode('MEJRI ISSAM');
$fl['subject'] 			= 'item_3';
$fl['reply_to_name']    = 'item_1';
$fl['reply_to_email']   = 'item_2';
$fl['receipt_template'] = '';
$fl['email_template']   = '';
$fl['email_subject_template']   = '';
$fl['receipt_subject_template']   = '';

// ! -- USERS
$fl['login_required']   =  false; // true or false
$fl['user_logins']     	=  array();

//array of fields in form. (In the format "field_name" => "field_label")
$fl['form_fields'] = array(
						"item_1" => 'Name',
						"item_2" => 'Email',
						"item_3" => 'Subject',
						"item_4" => 'Message',
						"item_5" => 'ydfl-do-not-process',
);


$fl['notify_enabled']   = false ; // email admin_email any errors
$fl['notify_email']     = 'infor_issam@yahoo.fr' ; // email admin_email any errors

// ! -- RECIPIENTS
$fl['to']               = array("infor_issam@yahoo.fr"=>"MEJRI ISSAM",); // To
$fl['cc']               = array(); // Cc
$fl['bcc']              = array(); // Bcc
$fl['reply']            = array(); // Reply-To


$fl['date'] 					= date('r');
$fl['encoding_method'] 			= 'quoted-printable'; // base64, 7bit, 8bit
$fl['encoding_charset'] 		= 'utf-8';
$fl['success_redirect']			= false; // true or false
$fl['success_url'] 				= '';
$fl['error_redirect'] 			= false; // true or false
$fl['error_url'] 				= '';

// ! -- RECEIPT
$fl['send_receipt'] 			= false; // true or false
$fl['send_receipt_files']       = false; // true or false
$fl['receipt_prefix'] 			= html_entity_decode('Re:'); // precedes the receipt email subject
$fl['receipt_files']            = array(); // Receipt Files

// ! --SECURITY 	
$fl['allowed_file_types'] 		= "doc|xls|pdf|jpg|jpeg|png|gif|zip|rar|gz";
//$fl['use_captcha'] 			= "true"; // not used
$fl['recaptcha_public_key'] 	= '';
$fl['recaptcha_private_key'] 	= '';
$fl['max_attachment_size'] 		= 10;
$fl['max_attachment_size_bytes'] = $fl['max_attachment_size'] * 1024; // Covert KB to bytes value
$fl['email_filter_regexp'] 		= 'to:|cc:|bcc:';
$fl['blocked_message'] 			= 'You have been blocked from future submissions.';
$fl['block_emails']             = array();
$fl['block_ips']                = array();

// ! --DKIM SIGNING
$fl['dkim']						= false; // bool
$fl['dkim_domain']				= '';
$fl['dkim_privkey_path']		= realpath('formloom-page2.key'); // file created and published.
$fl['dkim_selector']			= '';
$fl['dkim_passphrase']			= '';

// ! -- MySQL PREFS
$fl['save_to_mysql'] 			=  false; // true or false
$fl['do_not_send'] 				=  false; // true or false
$fl['mysql_host'] 				= '';
$fl['mysql_db'] 				= '';
$fl['mysql_user'] 				= '';
$fl['mysql_password'] 			= '';
$fl['mysql_table'] 				= '';
$fl['mysql_query']              = array(  ); // array of field->item values

// ! -- GOOGLE SHEEETS PREFS
$fl['save_to_google']           =  false; // true or false
$fl['google_spreadsheet']       = '';
$fl['google_query']             = array(  ); // array of column->item values


$fl['ip_field'] 				= ''; // leave blank to skip
$fl['browser_field'] 			= ''; // leave blank to skip
$fl['date_field'] 				= ''; // leave blank to skip

// ! -- SMTP
$fl['use_smtp']					=  false;
$fl['smtp_host'] 				= '';
$fl['smtp_port'] 				= '25';
$fl['smtp_auth'] 				= false; // (bool)
$fl['smtp_username'] 			= '';
$fl['smtp_password'] 			= '';
$fl['smtp_debug'] 				= '0'; // leave off for now
$fl['smtp_secure'] 				= false; // (bool)
$fl['smtp_secure_prefix'] 		= 'ssl';

// ! -- MESSAGE STRINGS
$fl['error_message'] 			= 'Oops! An error occurred.';
$fl['success_message'] 			= 'Your form was sent successfully.';
$fl['captcha_failed'] 			= 'Security test failed, please try again';
$fl['file_too_big'] 			= 'The file was too big, try something smaller.';
$fl['file_not_allowed'] 		= 'Sorry, we do not accept that type of file.';
$fl['required_field_alert'] 	= 'Fields marked with * are required.';
$fl['invalid_email'] 			= '%invalid-email%';
$fl['ok_button'] 				= '%ok-button%';
$fl['redirect_message'] 		= '%redirect-message%';
$fl['invalid_login']            = 'Invalid Login, please try again.';




//======================================================================//
// ! START PROCESSING
//======================================================================//
                
// ! -- INIT ERROR ARRAY
$errors = array();

//======================================================================//
// ! PHP 5.3 CHECK
//======================================================================//
$php_version = phpversion();
$php_check = 'bad'; // assume it is bad
if( $php_version < 5.3 ){
	$php_error = "Formloom Requires PHP Version 5.3 or better<br />".
	"The server this script is hosted on is using PHP Version $php_version.<br />".
	"Upgrade your server to PHP 5.3 and try again.";
	die($php_error);
}else{
	$php_check = 'good';
}

//======================================================================//
// ! CGI FIX
//======================================================================//
// Some hosts (was it GoDaddy?) complained without this
@ini_set('cgi.fix_pathinfo', 0);

//======================================================================//
// ! PHP 5.3 will complain without this
//======================================================================//
if(ini_get('date.timezone') == '') date_default_timezone_set('GMT');

// ! -- LOAD REQUIRED CLASSES
require_once(dirname(__FILE__) . DIRECTORY_SEPARATOR .'formloom3/lib/ydmailer.php');

$output='{"result":"fail", "msg":"'.$fl['error_message'].'(001)"}'; // init

//=====================================================//
// ! - POST SUBMITTED
//=====================================================//


if(
( (!empty($_SERVER['HTTP_X_REQUESTED_WITH'])  && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest' )
||  ( isset($_POST['ydfl_xmlhttprequest']) && $_POST['ydfl_xmlhttprequest'] == 'iesux' && preg_match('/(?i)msie [1-9]/',$_SERVER['HTTP_USER_AGENT']))) || $debug_enabled
):

$mailer = new ydmailer;
$mailer->settings = $fl;

//=====================================================//
// ! - SECURITY CHECKS
//=====================================================//

// ! USER LOGIN
if( $fl['login_required'] && !$_SESSION['logged_in'] )
{	
	if( $mailer->validateUserLogin($_POST['fl_username'], $_POST['fl_password']) )
	{
		$_SESSION['logged_in'] = true;
		echo '{"result":"loginsuccess"}';
		exit;
	}else{
        $_SESSION['logged_in'] = false;
        $msg .= '<div class="notification alert-error spacer-t10"><p><i class="fa fa-bomb"></i> '.$fl['invalid_login'].'</p><a href="#" class="close-btn">&times;</a></div>'.PHP_EOL;
        echo json_encode(array('result'=>'loginfail', 'msg'=>$msg));
        exit;
	}

}

// SPAM checking. If the "comment" form field has been filled out,
// send back to form asking to remove content and exit the script.
if ( isset($_POST['rellikmaps']) ) {
    array_push($errors, 'Please remove content from the last textarea before submitting the form again. This is to protect against SPAM abuse.') ;
}

//=====================================================//
// ! - CAPTCHA VALIDATION
//=====================================================//
            
if(isset($_POST["ydfl_securitycode"])){
	$securitycode = strip_tags(trim($_POST["ydfl_securitycode"]));
	if (!$securitycode) {
		array_push($errors, "You must enter the security code");
	} else if (md5($securitycode) != $_SESSION['ydflCheck']['securitycode']) {
		array_push($errors, $fl['captcha_failed']);
	}
}

//=====================================================//
// ! - CAPTCHA & VALIDATION
//=====================================================//

// ! -- reCAPTCHA CHECK
# was there a reCAPTCHA response?
if(array_key_exists('g-recaptcha-response', $_POST))
{	
    // !-- reCAPTCHA TEST
    $recaptcha_result = $mailer->recaptchaCheckAnswer();
    if ( $recaptcha_result != 'good') 
    {    
        array_push($errors, $fl['captcha_failed']);
    }
    unset($recaptcha_result);
}

// ! -- CHECK REQUIRED FIELDS
$required = $mailer->checkRequiredFields();
if($required != 'good')
{
    array_push($errors, $fl['required_field_alert']);
}


// ! -- REPLY EMAIL VALIDATION
if (!$fl['do_not_send'])
{
	if(!$mailer->validateEmail($_POST['form'][$fl['reply_to_email']]))
	{
	        array_push($errors, 'Reply-To Item "'.$fl['reply_to_email'].'" has a value of "'.$_POST['form'][$fl['reply_to_email']].'" which is an invalid email format.<br>This usually happens when you assign the incorrect Item Name to the Reply-To Item setting.');
	}
}

//=====================================================//
// ! FILTER INPUT FOR HACK ATTEMPTS 
//=====================================================//

if(!empty($fl['email_filter_regexp'])) {
    foreach ($_POST['form'] as $key => $value)
    { 		    
        // removed line breaks in 3.0.4 03-09-2015 10:23:46am -MY
        $filter = '/to:|cc:|bcc:|'.$fl['email_filter_regexp'].'/i';
        $newValue = preg_replace( $filter ,'***',$value);
        $_POST['form'][$key] = $newValue;
    }
}

//=====================================================//
// ! BLOCKED?
//=====================================================//

// Email Blocked?
if( in_array( strtolower($_POST['form'][$fl['reply_to_email']]), $fl['block_emails'])) {
    array_push($errors, $fl['blocked_message']);
}

// IP Blocked?
$banned_ips = $fl['block_ips'];

if(count($banned_ips)) {
	
	array_pop($banned_ips);
	$thisip = $mailer->getIPAddress();
	
	if(in_array($thisip,$banned_ips)) {
	    // this is for exact matches of IP address in array
	    array_push($errors, $fl['blocked_message']);
	} else {
	    // this is for wild card matches
	    foreach($bannedIP as $ip) {
	        if(preg_match("/^{$ip}/i", $thisip)){
	            array_push($errors, $fl['blocked_message']);
	            break;
	        }
	    }
	}

}

//=====================================================//
// ! - ATTACHMENTS
//=====================================================//

// process any attachments if present...
$files = $mailer->processAttachments();
if( $files != 'good' )
    array_push($errors, $files);


//=====================================================//
// ! - CUSTOM PHP CODE (ADVANCED)
//=====================================================//



//=====================================================//
// ! - PROCESS
//=====================================================//
if (!$errors)
{
    // process form...
    $mailer->processForm();
}else{
    // notify owner of errors...
    if($fl['notify_enabled'] ){
	    $msg = "Errors:".PHP_EOL;
	    foreach($errors as $error)
	    	$msg .= "-- $error".PHP_EOL;
        $mailer->notifyOwner($msg);
    }
}
	

$output = $mailer->getOutput($errors, $required);

endif; // if POSTED


echo $output;



?>