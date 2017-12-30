<?php
    
//=====================================================//
//
// ! YABDAB - MAILER CLASS v.3.0.7
// - MODIFIED: 06-08-2015 08:59:52 am
// - author: Mike Yrabedra
// - (c)2011-2015 Yabdab Inc. All rights reserved.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
//  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
//  THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
//  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
//  OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
//  HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
//  TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//=====================================================//

//SMTP needs accurate times, and the PHP time zone MUST be set
//This should be done in your php.ini, but this is how to do it if you don't have access to that
if(ini_get('date.timezone') == '') date_default_timezone_set('GMT');

// ! -- LOAD REQUIRED HELPER CLASSES
//require_once(dirname(__FILE__) . DIRECTORY_SEPARATOR .'recaptchalib.php'); // include reCAPTCHA lib
require_once(dirname(__FILE__) . DIRECTORY_SEPARATOR .'browser.php'); // include browser sniffer lib
require_once (dirname(__FILE__) . DIRECTORY_SEPARATOR .'PHPMailerAutoload.php') ; // PHPMailer
require_once(dirname(__FILE__) . DIRECTORY_SEPARATOR .'spreadsheet.php'); // For Google Sheets

class YDMailer {
    
    //  Set Variables for Class Use...
    //private $recaptcha;
    private $browser;
    private $mysqli;
    private $mysql_insert_id = '';
    
    public $settings = array();
    public $email_content = '';
    public $receipt_content = '';
    public $files = array();
    public $errors = array();
    
    //======================================================================================//
    // + INSTANTIATE OTHER CLASSES
    //======================================================================================//
    
    function __construct() {
        
        $this->browser = new Browser;

    }
    
    //=====================================================//
    // ! - HELPER FUNCTIONS
    //=====================================================//
    
    public function recaptchaCheckAnswer()
    {
        // Get a key from http://recaptcha.net/api/getkey
        /*
         $publickey = $this->settings['recaptcha_public_key'];
        $privatekey = $this->settings['recaptcha_private_key'];
        $resp = null;
        $error = null;
        $resp = recaptcha_check_answer($privatekey,$_SERVER["REMOTE_ADDR"],$_POST['recaptcha_challenge_field'],$_POST['recaptcha_response_field']);
        
        if (!$resp->is_valid) {
            # set the error code so that we can display it
            return $resp->error;
        }
        
        return 'good';
         */
        
        $secret = $this->settings['recaptcha_private_key'];
        
        if(isset($_POST['g-recaptcha-response']))
            $response=$_POST['g-recaptcha-response'];
        
        if(!$response){
            return 'Please check the the captcha form.';
            exit;
        }
        
        $verify=file_get_contents("https://www.google.com/recaptcha/api/siteverify?secret={$secret}&response={$response}&remoteip=".$_SERVER['REMOTE_ADDR']);
        
        $captcha_success=json_decode($verify);
        
        if ($captcha_success->success==false) {
            return "damn bots";
        }
        else if ($captcha_success->success==true) {
            return "good";
        }
        
        
    }
    
    public function processForm()
    {
        
        $this->settings['woosh'] = ($this->settings['smtp_host'] == 'woosh' && $this->settings['use_smtp'])?1:0;
        
        if(!$this->settings['do_not_send'])
        {
            // send main message
            $this->buildEmailContent();
            
            if($this->settings['woosh']) {
                $send = trim($this->sendWithWoosh());
            }else{
                $send = $this->sendMessage();
            }

            if($send != 'good')
                @array_push($this->errors, $send);
            
            // send receipt to submitter
            if($this->settings['send_receipt'])
            {
                $this->buildReceiptContent();
                
                if($this->settings['woosh']) {
                    $receipt = $this->sendWithWoosh(true);
                }else{
                    $receipt = $this->sendMessage(true);
                }
                
                if($receipt != 'good')
                    @array_push($this->errors, $receipt);
            }
        }
        
        // Save to MySQL?
        if($this->settings['save_to_mysql']){
            $rs = $this->saveToMySQL();
            if($rs != 'good')
                @array_push($this->errors, $rs);
            unset($rs);
        }
        
        // Save to Google Sheets?
        if($this->settings['save_to_google']){
            $rs = $this->saveToGoogle();
            if($rs != 'good')
                @array_push($this->errors, $rs);
            unset($rs);
        }
        
        
        
    }
    
    //=====================================================//
    // processAttachments
    //=====================================================//
    
    public function processAttachments()
    {
        if (isset($_FILES)) {
            
            foreach ($_FILES as $attachment) {
                
                $attachment_name = $attachment['name'];
                $attachment_size = $attachment["size"];
                $attachment_temp = $attachment["tmp_name"];
                $attachment_type = $attachment["type"];
                $attachment_ext  = explode('.', $attachment_name);
                $attachment_ext  = $attachment_ext[count($attachment_ext)-1];
                
                if ( $attachment['error'] === UPLOAD_ERR_OK && is_uploaded_file($attachment['tmp_name']) ) {
                    
                    // User set filtering; size, ext, etc...
                    if(@stristr($this->settings['allowed_file_types'], $attachment_ext) == FALSE){ // make sure we accet this file type....
                        return $this->settings['file_not_allowed'];
                    }
                    
                    // See is file is not too big.
                    if($attachment_size > $this->settings['max_attachment_size_bytes']){
                        return $this->settings['file_too_big'] ;
                    }
                    
                    $file = fopen($attachment_temp,'rb');
                    $data = fread($file,filesize($attachment_temp));
                    fclose($file);
                    $data = chunk_split(base64_encode($data));
                    
                    
                    // add to array for phpmailer to use...
                    array_push($this->files, array('temp'=> $attachment_temp, 'name' => $attachment_name));
                    
                } else if ($attachment['error'] !== UPLOAD_ERR_NO_FILE) {
                    
                    // ! -- SERVER ERRORS
                    switch ($attachment['error']) {
                        case UPLOAD_ERR_INI_SIZE:
                        case UPLOAD_ERR_FORM_SIZE:
                            $error = "File $attachment_name exceeds the " . ini_get('upload_max_filesize') . 'B limit for the server.';
                            break;
                        case UPLOAD_ERR_PARTIAL:
                            $error = "Only part of the file $attachment_name could be uploaded, please try again.";
                            break;
                        default:
                            $error = "There has been an error attaching the file $attachment_name, please try again.";
                    }
                    
                    return $error;
                    
                } // file was uploaded
                
            }
            
            
        }
        
        return 'good';
        
    }
    
    
    
    private function saveToMySQL()
    {
        
        
        // Connect to database
        $this->mysqli = new mysqli($this->settings['mysql_host'],
                                   $this->settings['mysql_user'],
                                   $this->settings['mysql_password'],
                                   $this->settings['mysql_db']);
        
        if ($this->mysqli->connect_error)
        {
            return 'Formloom was unable to connect to the MySQL database "'.$this->settings['mysql_db'].'" on the host located at "'.$this->settings['mysql_host'].'" using the username and password provided. Please make sure all the MySQL credentials entered are valid.';
        }
        
        // set encoding to utf-8
        $this->mysqli->set_charset('utf8');
        
        
        // Build query
        $inserts = '';
        foreach($this->settings['mysql_query'] as $k => $v)
        {
            if(isset($_POST['form'][$v]) && $k)
                $inserts .= " ". $k . " = '" . $this->mysqli->real_escape_string( $this->value( $_POST['form'][$v], ", ", false ) ) . "',";
        }
        
        // ip address?
        if( !empty($this->settings['ip_field']) )
            $inserts .= " " . $this->settings['ip_field'] . " = '" . $this->getIPAddress() . "',";
        
        
        // browser?
        if( !empty($this->settings['browser_field']) )
            $inserts .= " " . $this->settings['browser_field'] . " = '" . $this->_getBrowser() . "',";
        
        
        // date?
        if( !empty($this->settings['date_field']) )
            $inserts .= " " . $this->settings['date_field'] . " = NOW() ,";
        
        // remove last comma
        $inserts = substr($inserts, 0, -1); // remove last comma
        
        // Save data
        $sql = "INSERT INTO `". $this->settings['mysql_db']. "`.`". $this->settings['mysql_table']. "` SET ". $inserts;
        
        
        $this->mysqli->query( $sql );
        
        if ($this->mysqli->error) {
            return 'MySQL error ' . $this->mysqli->error . ' When executing: ' . $sql;
        }
        
        // added 12-24-2014 09:22:11 am -MY
        $this->mysql_insert_id = $this->mysqli->insert_id;
        
        
        $this->mysqli->close();
        
        return 'good';
        
    }
    

    private function saveToGoogle()
    {
        
        // build add array
        $add = array();
        foreach($this->settings['mysql_query'] as $k => $v)
        {
            if(isset($_POST['form'][$v]) && $k)
                $add[$k] = $this->value($_POST['form'][$v],", ", false);
        }
        
        // ip address?
        if( !empty($this->settings['ip_field']) )
            $add[$this->settings['ip_field']] = $this->getIPAddress();
        
        
        // browser?
        if( !empty($this->settings['browser_field']) )
            $add[$this->settings['browser_field']] = $this->_getBrowser();
        
        
        // date?
        if( !empty($this->settings['date_field']) )
            $add[$this->settings['date_field']] = $this->_getDate();
        
        
        $rs = $Spreadsheet = new Spreadsheet($this->settings['google_spreadsheet']);
        
        $rs = $Spreadsheet->add( $add );
        
        if($rs != 'good'){
            return $rs;
        }else{
            return 'good';
        }
        
    }

    
    private function sendWithWoosh($receipt=false)
    {
        // Reply-To
        $reply_to_email = $_POST['form'][$this->settings['reply_to_item']];
        if(!$this->validateEmail($reply_to_email)) {
            $err="The value of the Reply-To item ( ".$reply_to_email." ) is not a valid email address.";
            @array_push($this->errors, $err);
            unset($err);
        }
        // From
        $from_email = $this->settings['from_email'];
        $from_name = $this->settings['from_name'];
        if(!$this->validateEmail($from_email)) {
            $err="The value of the From Email ( ".$from_email." ) is not a valid email address.";
            @array_push($this->errors, $err);
            return $err; // stop here, no need to go further.
        }
        
        
        if($receipt)
        {
            // receipt for sender...
            $params = array('to'=>$reply_to_email,
                            'from_name'=>$from_name,
                            'from_email'=>$from_email,
                            'reply_to_email'=>$from_email,
                            'subject'=>strip_tags($this->settings['receipt_prefix'].$this->settings['subject']),
                            'body_html'=>$this->receipt_content,
                            'body_text'=>$this->_html2Text($this->receipt_content),
                            'source'=>$_REQUEST['url']
                            );
            
            $rs = $this->_http_post($params);
            $rs = json_decode($rs);
            if($rs->result != "success")
            {
                $err = $rs->message;
                @array_push($this->errors, $err);
                return $err; // stop here, no need to go further.
            }
            
        }else{
            
            $params = array('to'=>$this->settings['to'],
                            'from_name'=>$from_name,
                            'from_email'=>$from_email,
                            'reply_to_email'=>$reply_to_email,
                            'cc'=>$this->settings['cc'],
                            'bcc'=>$this->settings['bcc'],
                            'subject'=>$this->settings['subject'],
                            'body_html'=>$this->email_content,
                            'body_text'=>$this->_html2Text($this->email_content),
                            'source'=>$_REQUEST['url']
                            );
            
            $rs = $this->_http_post($params);
            
            //mail('mike@yabdab.com','woosh test', $rs);
            
            $rs = json_decode($rs);
            if($rs->result != "success")
            {
                $err = $rs->message;
                @array_push($this->errors, $err);
                return $err; // stop here, no need to go further.
            }
            
        }
        
        
        return 'good';
        
        
    }
    
    private function sendMessage($receipt=false)
    {
        
        
        try {
            
            //Create a new PHPMailer instance
            $mail = new PHPMailer();
            $mail->isHTML = true; // make optional ?
            

            // Build Mailer
            if($this->settings['use_smtp'])
            {
                
                $mail->isSMTP();
                $mail->SMTPDebug 	= $this->settings['smtp_debug'];
                $mail->Debugoutput 	= 'html';
                $mail->Host 		= $this->settings['smtp_host'];
                $mail->Port 		= $this->settings['smtp_port'];
                $mail->SMTPAuth 	= $this->settings['smtp_auth'];
                $mail->Username 	= $this->settings['smtp_username'];
                $mail->Password 	= $this->settings['smtp_password'];
                if($this->settings['smtp_secure'])
                    $mail->SMTPSecure 	= $this->settings['smtp_secure_prefix'];
                
                
                // Google example:
                //$mail->SMTPAuth = true;                // enable SMTP authentication
                //$mail->SMTPSecure = "tls";              // sets the prefix to the servier
                //$mail->Host = "smtp.gmail.com";        // sets Gmail as the SMTP server
                //$mail->Port = 587;
                // set the SMTP port for the GMAIL
                
            }
            
            
            //  Sign with DKIM
            if($this->settings['dkim'])
            {
                $mail->DKIM_domain = $this->settings['dkim_domain'];
                $mail->DKIM_private = $this->settings['dkim_privkey_path'];
                $mail->DKIM_selector = $this->settings['dkim_selector']; //this effects what you put in your DNS record
                $mail->DKIM_passphrase = $this->settings['dkim_passphrase'];
            }
            
            
            // Reply-To
            $reply_to_email = $_POST['form'][$this->settings['reply_to_email']];
            $reply_to_name = $_POST['form'][$this->settings['reply_to_name']];
            
            if( !$this->validateEmail($reply_to_email) ) {
                $err = "The value of the Reply-To item ( {$reply_to_email} ) is not a valid email address.";
                @array_push($this->errors, $err);
                unset($err);
            }
            // From
            $from_email = $this->settings['from_email'];
            $from_name = $this->settings['from_name'];
            if(!$this->validateEmail($from_email)) {
                $err="The value of the From Email ( ".$from_email." ) is not a valid email address.";
                @array_push($this->errors, $err);
                return $err; // stop here, no need to go further.
            }
            
            
            if($receipt)
            {
                
                // buils receipt subject string
                $subject = $this->parseTemplate('receipt_subject');
                
                // To senders...
                $to = array($reply_to_email=>$reply_to_name);
                
                // Reply-To
                $mail->AddReplyTo( $from_email, $from_name );
                
                // From
                $mail->SetFrom( $from_email, $from_name );
                // Subject
                $mail->Subject = strip_tags($subject);
                // Body
                $mail->msgHTML($this->receipt_content);
                // Add Plain Text Part
                $mail->AltBody = $this->_html2Text($this->receipt_content);
                
                $mail->CharSet = $this->settings['encoding_charset'];
                $mail->Encoding = $this->settings['encoding_method'];
                
                $mail->isHTML = true; // make optional ?
                
                
                // Attach Resource File(s) from Onwer to Sender ?
                if($this->settings['send_receipt_files']) {
                    
                    foreach($this->settings['receipt_files'] as $attachment)
                    {
                        $path = $attachment;
                        if(file_exists($path)){
                            $mail->addAttachment( $path ); // path , name
                            //addAttachment($path, $name = '', $encoding = 'base64', $type = '', $disposition = 'attachment')
                        }
                    }
                }
                
                
                
                
            }else{
                
                // buils email subject string
                $subject = $this->parseTemplate('email_subject');
                
                $to = $this->settings['to'];
                
                // Cc recipients...
                if($this->settings['cc']) {
                    $cc = $this->settings['cc'];
                    foreach ($cc as $address => $name)
                    {
                        if (is_int($address)) {
                            $mail->AddCC($name);
                        } else {
                            $mail->AddCC($address , $name);
                        }
                    }
                }
                
                // Bcc recipients...
                if($this->settings['bcc']) {
                    $bcc = $this->settings['bcc'];
                    foreach ($bcc as $address => $name)
                    {
                        if (is_int($address)) {
                            $mail->AddBCC($name);
                        } else {
                            $mail->AddBCC($address , $name);
                        }
                    }
                }
                
                // ReplyTo recipients...
                // these are in addition to the dynamic value sent from form.
                
                // primary reply-to (dynamic)
                $mail->AddReplyTo( $reply_to_email, $reply_to_name );
                
                if($this->settings['reply']) {
                    $reply = $this->settings['reply'];
                    foreach ($reply as $address => $name)
                    {
                        if (is_int($address)) {
                            $mail->AddReplyTo($name);
                        } else {
                            $mail->AddReplyTo($address , $name);
                        }
                    }
                }
                
                
                
                // From (static value, not dynamic )
                $mail->SetFrom( $from_email, $from_name );
                
                // Subject
                $mail->Subject = strip_tags($subject);
                
                $mail->CharSet = $this->settings['encoding_charset'];
                $mail->Encoding = $this->settings['encoding_method'];
                
                // Body
                $mail->msgHTML($this->email_content);
                // Add Plain Text Part
                $mail->AltBody = $this->_html2Text($this->email_content);
                
                // Attachments?
                if($this->files){
                    for ( $i = 0; $i < sizeof ( $this->files ); $i++ )
                    {
                        // Maybe add disposition for inline attachments later...
                        $mail->addAttachment($this->files[$i]['temp'], $this->files[$i]['name']);	// path, name
                    }
                }
                
            }
            
            
            
            // Send the message
            $failed = array();
            $numSent = 0;
            
            //send the message, check for errors
            
            if(is_array($to)) {
                foreach ($to as $address=>$name)
                {
                    if (is_int($address)) {
                        $mail->AddAddress($name);
                    } else {
                        $mail->AddAddress($address, $name);
                    }
                    //send the message, check for errors
                    if (!$mail->send()) {
                        $failed[] .= $mail->ErrorInfo;
                    } else {
                        $numSent++;
                    }
                    
                    $mail->ClearAddresses();
                }
            }
            
            
            if(!$numSent || count($failed) )
            {
                $error = "$numSent message were sent. The following addresses had problems, ".implode(", ", $failed);
                
                @array_push($this->errors, $error);
                
                return;
                
            }
            
            
            
        } catch (phpmailerException $e) {
            echo $e->errorMessage(); //Pretty error messages from PHPMailer
        } catch (Exception $e) {
            echo $e->getMessage(); //Boring error messages from anything else!
        }
        
        
        $mail->ClearAllRecipients( ); // clear all
        
        unset($mail);
        unset($message);
        
        return 'good';
        
    }
    
    private function buildEmailContent()
    {
        
        $tpl = trim($this->settings['email_template']);
        
        if( empty($tpl) )
        {
            
            $this->email_content = $this->buildDefaultHtmlContent();
            
        }else{
            
            $this->email_content = $this->parseTemplate('email');
            
        }
        
    }
    
    private function buildReceiptContent()
    {
        
        $tpl = trim($this->settings['receipt_template']);
        
        if( empty($tpl) )
        {
            $this->receipt_content = $this->buildDefaultHtmlContent('receipt');
        }else{
            $this->receipt_content = $this->parseTemplate('receipt');
        }
        
    }
    
    //=====================================================//
    // buildDefaultHtmlContent
    //=====================================================//
    
    private function buildDefaultHtmlContent($type='email')
    {
        
        $subject = ($type == 'receipt')	? $this->settings['receipt_prefix'].$this->settings['subject'] : $this->settings['subject'];
        
        //Set a variable for the message content
        $str = "<html>".PHP_EOL."<head>".PHP_EOL."<title>" .
        $this->_safeEscapeString($subject) .
        "</title>".PHP_EOL."</head>".PHP_EOL."<body>".PHP_EOL."<p>".PHP_EOL;
        
        $str .= "<table><tbody>".PHP_EOL;
        
        if($type == 'receipt')
        {
            $str .= '<p>We received your message containing the following values...</p>';
        }
        
        $form = $_REQUEST['form']; // need to use REQUEST because POST has issues with line-breaks
        
        //build a message from the reply for both HTML and text in one loop.
        foreach ($form as $key => $value) {
            
            $label = $this->settings['form_fields'][$key];
            $str .= '<tr><td align="right" valign="top" nowrap><b>' . strip_tags($label) . '</b></td><td> ';
            $str .= nl2br($this->value($value)) . "</td></tr>".PHP_EOL;
            
        }
        //close the HTML content.
        $str .= "</tbody></table>".PHP_EOL;
        $str .= "</p>".PHP_EOL."</body>".PHP_EOL."</html>";
        
        return $str;
        
    }
    
    //=====================================================//
    // parseTemplate
    //=====================================================//
    
    // edited: 02-24-2015 11:52:27 am -MY
    // Prevented subject from getting encoded.
    
    private function parseTemplate($type = 'email')
    {
        
        switch($type)
        {
            case 'email':
            $str =  $this->settings['email_template'];
            $encode = true;
            break;

            case 'email_subject':
            $str =  $this->settings['email_subject_template'];
            $encode = false;
            break;

            case 'receipt':
            $str =  $this->settings['receipt_template'];
            $encode = true;
            break;
                
            case 'receipt_subject':
            $str =  $this->settings['receipt_subject_template'];
            $encode = false;
            break;

            default:
            $str =  $this->settings['email_template'];
            break;
        }
        
        $form = $_REQUEST['form']; // need to use REQUEST because POST has issues with line-breaks
        
        foreach ($form as $key => $value)
        {
            $str = str_replace("#{$key}#", nl2br($this->value($value, ", ", $encode)), $str);
        }
        
        // browser
        $agent = $this->browser->getBrowser().' v.'.$this->browser->getVersion(). ' ('.$this->browser->getPlatform().')';
        $str = str_replace("#fl-browser#", $agent, $str);
        // ip address
        $str = str_replace("#fl-ip_address#", $_SERVER['REMOTE_ADDR'], $str);
        $str = str_replace("#fl-ip#", $_SERVER['REMOTE_ADDR'], $str);
        // date
        $str = str_replace("#fl-date#", date('r'), $str);
        // parent page
        $str = str_replace("#fl-page#", $_REQUEST['url'], $str);
        
        // Get rid of any unparsed place-holders
        // added 2013-11-29 06:47 am -MY
        $str = preg_replace('/#([A-Za-z0-9-._]*)#/', '', $str);
        
        return $str;
        
    }
    
    //=====================================================//
    // getOutput
    //=====================================================//
    
    public function getOutput($errors, $required) {
        
        $errors = array_merge($errors, $this->errors);
        $errors = array_unique($errors);
        $msg = ''; // init
        
        if(count($errors)){
            $missing = array();
            foreach($errors as $error)
            $msg .= '<br>'.str_replace('"', '\'', $error);
            
            if($this->settings['error_redirect'])
            {
                return json_encode( array('result'=>'fail', 'msg'=>$this->settings['redirect_message'],'redirect'=>1, 'redirect_url'=>$this->settings['error_url'] ) );
            }
            
            if(isset($required) && is_array($required))
            {
                $missing = $required;
            }
            return json_encode( array('result'=>'fail', 'msg'=>$msg, 'required'=>$missing, 'redirect'=>0, 'redirect_url'=>'' ) );
            unset($msg);
            unset($missing);
        }else{
            
            $msg = $this->settings['success_message'];
            
            if($this->settings['success_redirect'])
            {
                return json_encode( array('result'=>'good', 'msg'=>$msg, 'redirect'=>1, 'redirect_url'=>$this->settings['success_url']) );
            }else{
                return json_encode( array('result'=>'good', 'msg'=>$msg, 'redirect'=>0, 'redirect_url'=>'' ) );
            }
        }
        
        return;
        
        
    }
    
    
    //=====================================================//
    // validateEmail
    //=====================================================//
    
    public function validateEmail($email) {
        //check for all the non-printable codes in the standard ASCII set,
        //including null bytes and newlines, and exit immediately if any are found.
        if (preg_match("/[\\000-\\037]/",$email)) {
            return false;
        }
        $pattern = "/^[-_a-z0-9\'+*$^&%=~!?{}]++(?:\.[-_a-z0-9\'+*$^&%=~!?{}]+)*+@(?:(?![-.])[-a-z0-9.]+(?<![-.])\.[a-z]{2,16}|\d{1,3}(?:\.\d{1,3}){3})(?::\d++)?$/iD";
        if(!preg_match($pattern, $email)){
            return false;
        }
        return true;
    }
    
    //=====================================================//
    // checkRequiredFields
    //=====================================================//
    
    // Function to check the required fields are filled in.
    public function checkRequiredFields() {
        
        $err = 0;
        $fields = array();
        $rf = array(); // required fields array
        
        // loops through all post args and look for required args...
        foreach($_POST as $key => $value) {
            if(preg_match('/_required/', $key, $matches ))
            {
                array_push($rf, str_replace('_required', '', $key));
            }
        }
        
        foreach($rf as $key) {
            
            if (isset($_FILES[$key])) {
                $string = (isset($_FILES[$key]['name'])) ? $_FILES[$key]['name'] : '';
            } else {
                $string = $this->value($_POST['form'][$key]);
            }
            
            if( empty($string) )
            {
                array_push($fields, $key);
                $err++;
            }
            
            unset($v);
            
        }
        
        if($err){
            return $fields;
        }else{
            return 'good';
        }
    }
    
    //=====================================================//
    // validateUserLogin
    //=====================================================//
    
    function validateUserLogin($name, $password)
    {
        
        $users = $this->settings['user_logins'];
        
        foreach ( $users as $user => $pw ) {
            
            if( $name === $user && $password === $pw ){
                return true;
            }else{
                $ip = $this->getIPAddress();
                $msg = "Failed Login Attempt!\nUser:{$name}\nPassword:{$password}\nIP:{$ip}\n";
                $this->notifyOwner($msg);
            }
            
        }
        
        return false;
        
    }
    
    //=====================================================//
    // notifyOwner
    //=====================================================//
    
    function notifyOwner($message)
    {
        // notify owner?
        if($this->settings['notify_enabled']){
            $headers = 'Content-type: text/plain; charset=utf-8' . PHP_EOL;
            $headers .= 'From: "'.$this->settings['from_name'].'" <'.$this->settings['from_email'].'>' . PHP_EOL;
            $notification = "FormLoom Notification:".PHP_EOL.PHP_EOL;
            $notification .= "Page: ".$_SERVER['HTTP_REFERER']. PHP_EOL.PHP_EOL;
            $notification .= "Date: ".date('r'). PHP_EOL.PHP_EOL;
            $notification .= "Error: ".PHP_EOL.PHP_EOL.$message;
            @mail($this->settings['notify_email'], 'FormLoom Notification', $notification, $headers);
        }
        
    }
    
    
    //=====================================================//
    // value
    //=====================================================//
    
    public function value($var, $sep=", ", $encode=true){
        
        if($encode)
            $var = $this->_htmlEntities($var); // encode all html tags
        
        if(is_array($var)){
            $str = (isset($var)) ? implode($sep, $var) : '';
        }else{
            $str = (isset($var)) ? $var : '';
        }
        
        // added stringCleaner in 3.0.4 - 01-02-2015 09:27:18 am -MY
        return $this->_stringCleaner($str);
    }
    
    //=====================================================//
    // stringCleaner
    //=====================================================//
    
    private function _stringCleaner($str) {
        
        // removes smart quotes ( and such ) from strings and converts them to ascii
        
        $quotes = array(
                        "\xC2\xAB"     => '"', // « (U+00AB) in UTF-8
                        "\xC2\xBB"     => '"', // » (U+00BB) in UTF-8
                        "\xE2\x80\x98" => "'", // ‘ (U+2018) in UTF-8
                        "\xE2\x80\x99" => "'", // ’ (U+2019) in UTF-8
                        "\xE2\x80\x9A" => "'", // ‚ (U+201A) in UTF-8
                        "\xE2\x80\x9B" => "'", // ‛ (U+201B) in UTF-8
                        "\xE2\x80\x9C" => '"', // “ (U+201C) in UTF-8
                        "\xE2\x80\x9D" => '"', // ” (U+201D) in UTF-8
                        "\xE2\x80\x9E" => '"', // „ (U+201E) in UTF-8
                        "\xE2\x80\x9F" => '"', // ‟ (U+201F) in UTF-8
                        "\xE2\x80\xB9" => "'", // ‹ (U+2039) in UTF-8
                        "\xE2\x80\xBA" => "'", // › (U+203A) in UTF-8
                        );
        
        $str = strtr($str, $quotes);
        
        return $str;
        
    }
    
    //=====================================================//
    // safeEscapeString
    //=====================================================//
    
    // Function to escape data inputted from users. This is to protect against embedding
    // of malicious code being inserted into the HTML email.
    
    private function _safeEscapeString($string) {
        $str = strip_tags($string);
        $str = $this->_htmlEntities($str);
        return $str;
    }
    
    //=====================================================//
    // htmlEntities
    //=====================================================//
    
    private function _htmlEntities($mixed, $quote_style = ENT_QUOTES, $charset = 'UTF-8')
    {
        if (is_array($mixed)) {
            foreach($mixed as $key => $value) {
                $mixed[$key] = $this->_htmlEntities($value, $quote_style, $charset);
            }
        } elseif (is_string($mixed)) {
            $mixed = htmlentities(html_entity_decode($mixed, $quote_style), $quote_style, $charset);
        }
        return $mixed;
    }
    
    //=====================================================//
    // html2Text
    //=====================================================//
    
    private function _html2Text($str)
    {
        $text_str = str_replace("<br />", PHP_EOL, $str); // convert breaks into line-breaks.
        $text_str = strip_tags($text_str); // remove all markup.
        $text_str = htmlspecialchars_decode($text_str); // convert values with special chars back to unencoded.
        return $text_str;
    }
    
    //=====================================================//
    // http_post
    //=====================================================//
    
    private function _http_post($params)
    {
        $url = 'http://woosh.email/process';
        $postData = ''; // init
        
        // add files into the params first...
        
        // Attachments?
        foreach ($_FILES as $param => $file) {
            $params[$param] = '@' . $file['tmp_name'] . ';filename=' . $file['name'] . ';type=' . $file['type'];
        }
        
        // Attach Resource File ?
        if($this->settings['receipt_attach_file'] && file_exists($this->settings['receipt_file']))
        {
            
            //$file = array('receipt_file' => new CurlFile($this->settings['receipt_file'], '' /* MIME-Type */, ''));
            //array_push($params, $file);
        }
        
        
        $ch = curl_init();
        $header = array("Content-type: multipart/form-data");
        curl_setopt($ch,CURLOPT_URL,$url);
        curl_setopt($ch,CURLOPT_USERAGENT, "Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)");
        curl_setopt($ch,CURLOPT_RETURNTRANSFER,TRUE); // false seems to return errors from woosh script
        curl_setopt($ch,CURLOPT_HTTPHEADER,$header);
        curl_setopt($ch,CURLOPT_ENCODING,"");
        curl_setopt($ch,CURLOPT_FOLLOWLOCATION, TRUE);
        curl_setopt($ch, CURLOPT_POST, TRUE);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
        
        $output=curl_exec($ch);
        
        if($output === false)
        {
            echo "Error Number:".curl_errno($ch)."<br>";
            echo "Error String:".curl_error($ch);
        }
        
        curl_close($ch);
        return $output;
        
    }
    
    
    private function _getBrowser()
    {
        return $this->browser->getBrowser().' v.'.$this->browser->getVersion(). ' ('.$this->browser->getPlatform().')';
    }
    
    public function getIPAddress()
    {
        return (empty ( $_SERVER ['HTTP_CLIENT_IP'] ) ? (empty ( $_SERVER ['HTTP_X_FORWARDED_FOR'] ) ? $_SERVER ['REMOTE_ADDR'] : $_SERVER ['HTTP_X_FORWARDED_FOR']) : $_SERVER ['HTTP_CLIENT_IP']);
    }
    
    private function _getDate()
    {
        return date('r');
    }
    
    
    
    
}

//=====================================================//
// !  THE END 
//=====================================================//